import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/recruiter-login")({
  head: () => ({
    meta: [
      { title: "Recruiter Login — Yuvro Labs" },
      { name: "description", content: "Sign in to the Yuvro Labs recruiter workspace." },
      { property: "og:title", content: "Recruiter Login — Yuvro Labs" },
      { property: "og:description", content: "Access the Yuvro Labs recruiter workspace." },
    ],
  }),
  component: RecruiterLoginPage,
});

function RecruiterLoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const enter = () => {
    const dummyUser = {
      id: "demo-recruiter-id",
      email: "recruiter@yuvrolabs.com",
      username: "recruiter",
      first_name: "Riya",
      last_name: "Recruiter",
      roles: {
        ylabs: "recruiter"
      }
    };
    login(dummyUser as any, "dummy-token-123");
    nav({ to: "/recruiter" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    enter();
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A]" style={{ fontFamily: "'Inter Tight', Inter, system-ui, sans-serif" }}>
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md">
              <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Yuvro Labs</span>
          </Link>
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#6B6B6B] hover:text-[#0A0A0A]">
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-16 px-6 py-16 lg:grid-cols-2 lg:py-24">
        {/* Left — editorial copy */}
        <section className="flex flex-col justify-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">Recruiter Workspace</div>
          <h1 className="mt-4 text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] lg:text-[56px]">
            Sign in to your<br />
            <span className="relative inline-block">
              evaluation workspace
            </span>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#4A4A4A]">
            Review verified engineering capability. See how each candidate performed on real labs, knowledge
            assessments and Vitarka interviews — all in one report.
          </p>
          <ul className="mt-8 space-y-3 text-[13px] text-[#4A4A4A]">
            {[
              "SSO-ready · SOC 2 aligned",
              "Company-scoped candidate pipelines",
              "Shareable, exportable recruiter reports",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Right — login card */}
        <section className="flex items-center">
          <div className="w-full rounded-2xl border border-black/10 bg-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">Sign in</div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Recruiter access</h2>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-black/10">
                <ShieldCheck className="h-4 w-4 text-[#0A0A0A]" />
              </div>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Company Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 w-full rounded-md border border-black/15 bg-white px-3.5 py-2.5 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Password</label>
                <div className="relative mt-2">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-black/15 bg-white px-3.5 py-2.5 pr-10 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B6B6B] hover:text-[#0A0A0A]"
                    aria-label="Toggle password visibility"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-3 text-[14px] font-medium text-white transition hover:bg-black"
              >
                Sign In
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">
                    or
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={enter}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-4 py-3 text-[14px] font-medium text-[#0A0A0A] transition hover:border-[#0A0A0A]"
              >
                <KeyRound className="h-4 w-4" />
                Continue with SSO
              </button>

              <p className="pt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">
                Dummy login — any input enters the workspace
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
