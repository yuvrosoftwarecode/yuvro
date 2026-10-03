import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { ArrowRight, Github, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import YuvroLogo from "@/assets/YuvroLogo.png";

type Role = "student" | "job_seeker" | "recruiter";

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
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "linear-gradient(150deg, #0A0A0C 0%, #12100E 35%, #1A130D 60%, #0E0C0A 85%, #0A0A0B 100%)",
        color: "#EDEDF0",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Ambient warm glows (logo-inspired orange) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(720px 420px at 14% -10%, rgba(224,138,43,0.16), transparent 60%), radial-gradient(700px 460px at 92% 112%, rgba(224,138,43,0.10), transparent 62%), radial-gradient(480px 300px at 80% 6%, rgba(255,214,163,0.06), transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo + wordmark */}
        <div className="flex flex-col items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={YuvroLogo} alt="Yuvro" className="h-10 w-auto" />
            <span className="text-[22px] font-semibold tracking-tight text-white">Yuvro</span>
          </Link>
        </div>

        {/* Card */}
        <div
          className="mt-8 rounded-2xl border border-black/5 p-7 shadow-[0_24px_70px_-24px_rgba(6,20,60,0.55)]"
          style={{ background: "#FFFFFF", borderColor: "rgba(255,255,255,0.9)" }}
        >
          <h2 className="text-[20px] font-semibold tracking-tight" style={{ color: "#0F172A" }}>
            {tab === "signin" ? "Sign in to Yuvro" : "Create your account"}
          </h2>
          {tab === "signin" ? <SignInForm /> : <SignUpForm />}

          {/* OAuth Divider & Social Buttons */}
          <OAuthButtons />
        </div>

        {/* Below the card links */}
        {tab === "signin" ? (
          <p className="mt-6 text-center text-sm text-white/85">
            Don't have an account?{" "}
            <button onClick={() => setTab("signup")} className="font-semibold text-white hover:underline cursor-pointer">
              Create an account
            </button>
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-white/85">
            Already have an account?{" "}
            <button onClick={() => setTab("signin")} className="font-semibold text-white hover:underline cursor-pointer">
              Sign in
            </button>
          </p>
        )}
        <p className="mt-4 text-center text-xs">
          <Link to="/" className="hover:underline text-white/60">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const { redirect } = Route.useSearch();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.user?.id) {
        localStorage.removeItem(`is_first_login_${res.user.id}`);
      }
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
      window.location.href = target;
    } catch (error: any) {
      setErr(error?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email Address">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@test.com"
          className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
          style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
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
            className="w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
            style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label="Toggle password visibility"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <div className="flex items-center justify-between text-xs">
        <label className="flex cursor-pointer items-center gap-2" style={{ color: "#4B5563" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-[#2B5CE6]"
          />{" "}
          Remember me
        </label>
        <Link to="/forgot-password" className="font-medium hover:underline" style={{ color: "#2B5CE6" }}>
          Forgot password?
        </Link>
      </div>
      {err && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-70"
        style={{ background: "#2B5CE6", boxShadow: "0 10px 30px -12px rgba(43,92,230,0.6)" }}
      >
        {loading ? "Signing In..." : <>Sign In <ArrowRight className="h-4 w-4" /></>}
      </button>
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
  const [role, setRole] = useState<Role>("student");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const res = await authService.register({
        email: email.trim(),
        username: email.trim(),
        first_name,
        last_name,
        password: pwd,
        password_confirm: confirm,
        roles: { ylabs: role === "job_seeker" ? "student" : role },
      });
      if (res.user?.id) {
        localStorage.setItem(`is_first_login_${res.user.id}`, "true");
        localStorage.removeItem("mock_enrollments");
        localStorage.removeItem(`mock_enrollments_${res.user.id}`);
      }
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
    } finally {
      setLoading(false);
    }
  };

  const chip = (active: boolean) => ({
    background: active ? "#EEF3FE" : "#FFFFFF",
    borderColor: active ? "#2B5CE6" : "#E1E4EA",
    color: active ? "#2B5CE6" : "#4B5563",
  });

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Full Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
          style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
          placeholder="Ada Lovelace"
        />
      </Field>
      <Field label="Email Address">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
          style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
          placeholder="student@test.com"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password">
          <input
            type="password"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
            style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
            style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
            placeholder="••••••••"
          />
        </Field>
      </div>
      <Field label="Role">
        <div className="grid grid-cols-3 gap-2">
          {(["student", "job_seeker", "recruiter"] as Role[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              style={chip(role === r)}
              className="rounded-lg border px-2 py-2 text-xs capitalize transition cursor-pointer font-medium text-center"
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </Field>
      <label className="flex cursor-pointer items-start gap-2 text-xs" style={{ color: "#4B5563" }}>
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded accent-[#2B5CE6]"
        />
        <span>
          I agree to the{" "}
          <a href="#" className="hover:underline" style={{ color: "#2B5CE6" }}>
            terms
          </a>{" "}
          and{" "}
          <a href="#" className="hover:underline" style={{ color: "#2B5CE6" }}>
            privacy policy
          </a>
          .
        </span>
      </label>
      {err && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#FEF2F2", color: "#DC2626" }}>
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-70"
        style={{ background: "#2B5CE6", boxShadow: "0 10px 30px -12px rgba(43,92,230,0.6)" }}
      >
        {loading ? "Creating Account..." : <>Create Account <ArrowRight className="h-4 w-4" /></>}
      </button>
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
      const res = await authService.loginWithGoogle(tokenResponse.access_token);
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
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: "#E5E7EB" }} />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-[11px]" style={{ background: "#FFFFFF", color: "#6B7280" }}>
            or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => googleLogin?.()}
          disabled={!googleLogin}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium transition ${
            googleLogin ? "hover:bg-gray-50 cursor-pointer" : "opacity-50 cursor-not-allowed"
          }`}
          style={{ borderColor: "#E1E4EA", color: "#1F2937" }}
        >
          <GoogleIcon /> Google
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium transition opacity-50 cursor-not-allowed"
          style={{ borderColor: "#E1E4EA", color: "#1F2937" }}
        >
          <Github className="h-4 w-4" /> GitHub
        </button>
      </div>
      {oauthError && <p className="mt-2 text-xs text-center" style={{ color: "#DC2626" }}>{oauthError}</p>}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium" style={{ color: "#374151" }}>
        {label}
      </span>
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
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
