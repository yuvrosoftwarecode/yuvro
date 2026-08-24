import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import {
  ArrowRight,
  Github,
  Eye,
  EyeOff,
  Bot,
  Activity,
  GitBranch,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

const searchSchema = z.object({
  tab: z.enum(["signin", "signup"]).default("signin").catch("signin"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token) {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          let user: any = null;
          try {
            user = JSON.parse(userStr);
          } catch (e) {}
          if (user) {
            const role = user.roles?.ylabs || user.roles?.ycode || user.role;
            const r = role?.toLowerCase();
            if (r === "admin") throw redirect({ to: "/admin" });
            else if (r === "recruiter") throw redirect({ to: "/recruiter/dashboard" });
            else throw redirect({ to: "/student/dashboard" });
          }
        }
      }
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const nav = useNavigate();
  const { user, isAuthenticated } = useAuth();

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

  const setTab = (t: "signin" | "signup") =>
    nav({ to: "/auth", search: (prev: any) => ({ ...prev, tab: t }) });
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <BrandPanel />
      <div className="flex items-center justify-center p-6 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-sm">
              Y
            </div>
            <span className="font-semibold">Yuvro Labs</span>
          </div>
          <div className="flex rounded-lg border border-border bg-card/50 p-1 text-sm">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 rounded-md py-2 transition ${tab === "signin" ? "bg-gradient-to-r from-primary to-ui text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded-md py-2 transition ${tab === "signup" ? "bg-gradient-to-r from-primary to-ui text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              Create Account
            </button>
          </div>
          {tab === "signin" ? <SignInForm /> : <SignUpForm />}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-card via-background to-card border-r border-border/50 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-ui/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0.2_260/0.05)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.2_260/0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono shadow-lg shadow-primary/30">
          Y
        </div>
        <span>Yuvro Labs</span>
      </Link>
      <div className="max-w-md">
        <h1 className="text-4xl font-semibold tracking-tight leading-tight">
          Welcome to Yuvro Labs
        </h1>
        <p className="mt-3 text-muted-foreground">
          Build, Collaborate, Debug and Grow Like Real Engineers.
        </p>
        <div className="mt-8 rounded-2xl border border-border/80 bg-card/80 backdrop-blur p-4 shadow-2xl">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">sprint-12 · live</span>
            <span className="text-success">● 4 online</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { l: "Todo", n: 5, c: "muted-foreground" },
              { l: "Doing", n: 3, c: "primary" },
              { l: "Done", n: 12, c: "success" },
            ].map((x) => (
              <div key={x.l} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {x.l}
                </div>
                <div className="mt-1 text-xl font-semibold" style={{ color: `var(--${x.c})` }}>
                  {x.n}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {[
              { i: GitBranch, t: "feat: webhook retries merged", c: "success" },
              { i: Bot, t: "AI Mentor reviewed PR #247", c: "primary" },
              { i: Activity, t: "Build #1284 passed in 42s", c: "ui" },
              { i: Layers, t: "Sprint planning starts in 2h", c: "warning" },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <e.i className="h-3.5 w-3.5" style={{ color: `var(--${e.c})` }} />
                <span className="text-muted-foreground">{e.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
          {[
            { v: "120K+", l: "Tickets" },
            { v: "15K+", l: "Engineers" },
            { v: "500+", l: "Labs" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-xl font-semibold bg-gradient-to-br from-primary to-ui bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">© 2026 Yuvro Labs</div>
    </div>
  );
}

function SignInForm() {
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await authService.login(email, password);
      login(res.user, res.access);
      const role = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      const r = role?.toLowerCase();
      const defaultDest =
        r === "admin"
          ? "/admin"
          : r === "recruiter"
            ? "/recruiter/dashboard"
            : "/student/dashboard";
      const target = redirect || defaultDest;
      if (target.startsWith("http")) {
        window.location.href = target;
      } else {
        window.location.href = target;
      }
    } catch (error: any) {
      setErr(error?.message || "Invalid email or password.");
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Sign in to Yuvro</h2>
      <Field label="Email Address">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yuvrolabs.com"
          className="input"
        />
      </Field>
      <Field label="Password">
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />{" "}
          Remember me
        </label>
        <Link to="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </div>
      )}
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition"
      >
        Sign In <ArrowRight className="h-4 w-4" />
      </button>
      <OAuthButtons />
    </form>
  );
}

function SignUpForm() {
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name.");
    if (pwd.length < 6) return setErr("Password must be at least 6 characters.");
    if (pwd !== confirm) return setErr("Passwords do not match.");
    if (!agree) return setErr("Please accept the terms and privacy policy.");

    const names = name.trim().split(/\s+/);
    const first_name = names.shift() || "";
    const last_name = names.join(" ");

    try {
      // @ts-ignore
      const res = await import("@/services/authService").then((m) =>
        m.default.register({
          email: email.trim(),
          username: email.trim(),
          first_name,
          last_name,
          password: pwd,
          password_confirm: confirm,
        }),
      );
      login(res.user, res.access);
      const userRole = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      if (redirect) {
        if (redirect.startsWith("http")) window.location.href = redirect;
        else nav({ to: redirect as any });
      } else {
        const r = userRole?.toLowerCase();
        nav({
          to:
            r === "admin"
              ? "/admin"
              : r === "recruiter"
                ? "/recruiter/dashboard"
                : "/student/dashboard",
        });
      }
    } catch (error: any) {
      setErr(error?.message || "Registration failed.");
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
      <Field label="Full Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Ada Lovelace"
        />
      </Field>
      <Field label="Email Address">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password">
          <input
            type="password"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-border"
        />
        <span>
          I agree to the{" "}
          <a href="#" className="text-primary hover:underline">
            terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline">
            privacy policy
          </a>
          .
        </span>
      </label>
      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {err}
        </div>
      )}
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-ui px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition"
      >
        Create Account <ArrowRight className="h-4 w-4" />
      </button>
      <OAuthButtons />
    </form>
  );
}

function OAuthButtons() {
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const nav = useNavigate();
  const [oauthError, setOauthError] = useState("");

  const handleGoogleSuccess = async (tokenResponse: any) => {
    try {
      // @ts-ignore
      const res = await import("@/services/authService").then((m) =>
        m.default.loginWithGoogle(tokenResponse.access_token),
      );
      login(res.user, res.access);
      const userRole = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      if (redirect) {
        if (redirect.startsWith("http")) window.location.href = redirect;
        else nav({ to: redirect as any });
      } else {
        const r = userRole?.toLowerCase();
        nav({
          to:
            r === "admin"
              ? "/admin"
              : r === "recruiter"
                ? "/recruiter/dashboard"
                : "/student/dashboard",
        });
      }
    } catch (error: any) {
      console.error("Google login failed", error);
      setOauthError("Google login failed. Please try again later.");
    }
  };

  let googleLogin: (() => void) | undefined;

  try {
    googleLogin = useGoogleLogin({
      onSuccess: handleGoogleSuccess,
      onError: () => {
        console.error("Google Login Failed");
        setOauthError("Google Sign In was unsuccessful.");
      },
    });
  } catch (_e) {
    googleLogin = undefined;
  }

  return (
    <>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-background px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => googleLogin?.()}
          disabled={!googleLogin}
          className={`inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm transition ${googleLogin ? "hover:bg-accent cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
        >
          <GoogleIcon /> Google
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm hover:bg-accent transition opacity-50 cursor-not-allowed"
        >
          <Github className="h-4 w-4" /> GitHub
        </button>
      </div>
      {!googleLogin && (
        <p className="mt-2 text-xs text-muted-foreground">
          Google login is not configured for this environment.
        </p>
      )}
      {oauthError && <p className="mt-2 text-xs text-destructive">{oauthError}</p>}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
