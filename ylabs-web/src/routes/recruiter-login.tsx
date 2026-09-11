import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enter = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      const response = await authService.login(email, password);
      login(response.user, response.access);
      nav({ to: "/recruiter" });
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    enter();
  };

  const handleSSO = () => {
    alert("SSO is not configured for this domain.");
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

      <main className="mx-auto grid max-w-6xl gap-12 px-6 py-8 lg:grid-cols-2 lg:py-12">
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
          <div className="w-full rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">Sign in</div>
                <h2 className="mt-1 text-[22px] font-semibold tracking-tight">Recruiter access</h2>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-black/10">
                <ShieldCheck className="h-4 w-4 text-[#0A0A0A]" />
              </div>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-3">
              {error && (
                <div className="rounded-md bg-red-50 p-2 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Company Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                  className="mt-1.5 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full rounded-md border border-black/15 bg-white px-3 py-2 pr-9 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    disabled={loading}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-50"
                    aria-label="Toggle password visibility"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[13px] text-[#6B6B6B]">Don't have an account? </span>
                <Link to="/recruiter-signup" className="text-[13px] font-medium text-[#0A0A0A] hover:underline">
                  Sign up
                </Link>
              </div>

              <div className="relative">
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
                onClick={handleSSO}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-white px-4 py-2 text-[14px] font-medium text-[#0A0A0A] transition hover:border-[#0A0A0A] disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                Continue with SSO
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

