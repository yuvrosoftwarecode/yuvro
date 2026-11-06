import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { ArrowRight, Github, Eye, EyeOff, Loader2, ArrowLeft, Check } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import YuvroLogo from "@/assets/YuvroLogo.png";

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

  const setTab = (t: "signin" | "signup") => {
    nav({ to: "/auth", search: (prev: any) => ({ ...prev, tab: t }) });
  };

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
  const [agree, setAgree] = useState(false);

  // Email OTP inline validation state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpErr, setOtpErr] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async () => {
    setErr("");
    setOtpErr("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return setErr("Please enter a valid email address.");
    }

    setSendingOtp(true);
    try {
      await authService.sendSignupOtp(trimmedEmail);
      setOtpSent(true);
      setCooldown(30);
      setOtp("");
    } catch (error: any) {
      setErr(error?.message || "Failed to send verification code. Please check your email.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpErr("");
    setErr("");
    const code = otp.trim();
    if (code.length !== 6) {
      return setOtpErr("Please enter the complete 6-digit OTP.");
    }

    setVerifyingOtp(true);
    try {
      await authService.verifySignupOtp(email.trim(), code);
      setIsEmailVerified(true);
      setOtpSent(false);
      setOtpErr("");
    } catch (error: any) {
      setOtpErr(error?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!name.trim()) return setErr("Please enter your full name.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setErr("Please enter a valid email address.");
    }
    if (!isEmailVerified) {
      return setErr("Please validate your email address first.");
    }
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
        roles: { ylabs: "student" },
      });

      if (res.user?.id) {
        localStorage.setItem(`is_first_login_${res.user.id}`, "true");
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
      setErr(error?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="mt-6 space-y-4">
      <Field label="Full Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
          style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
        />
      </Field>

      <Field label="Email Address">
        <div className="relative flex items-center">
          <input
            type="email"
            required
            disabled={isEmailVerified || sendingOtp}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setOtpSent(false);
              setIsEmailVerified(false);
              setErr("");
              setOtpErr("");
            }}
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-24 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15 ${
              isEmailVerified ? "bg-emerald-50/30 border-emerald-300" : ""
            }`}
            style={{
              borderColor: isEmailVerified ? "#10B981" : "#E1E4EA",
              color: "#0F172A",
            }}
          />
          <div className="absolute right-2 flex items-center">
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                <Check className="h-3.5 w-3.5" />
                <span>Verified</span>
              </span>
            ) : sendingOtp ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 px-2.5 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={!email.trim() || sendingOtp}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#2B5CE6] hover:bg-blue-50 transition cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {otpSent ? "Resend" : "Validate"}
              </button>
            )}
          </div>
        </div>

        {isEmailVerified && (
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={() => {
                setIsEmailVerified(false);
                setOtpSent(false);
                setOtp("");
              }}
              className="text-[11px] text-gray-500 hover:text-gray-800 hover:underline cursor-pointer"
            >
              Change email
            </button>
          </div>
        )}
      </Field>

      {/* Inline OTP entry section on the same page */}
      {otpSent && !isEmailVerified && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-blue-900">Enter verification code</span>
            <span className="text-[11px] text-gray-500">
              {cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="text-[#2B5CE6] font-medium hover:underline cursor-pointer"
                >
                  Resend code
                </button>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (otp.length === 6 && !verifyingOtp) {
                    handleVerifyOtp();
                  }
                }
              }}
              className="w-full rounded-lg border bg-white px-3.5 py-2 text-base text-center font-semibold tracking-[0.25em] outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15"
              style={{ borderColor: "#CBD5E1", color: "#0F172A" }}
            />
            <button
              type="button"
              disabled={otp.length !== 6 || verifyingOtp}
              onClick={handleVerifyOtp}
              className="inline-flex items-center justify-center shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 cursor-pointer disabled:opacity-50"
              style={{ background: "#2B5CE6" }}
            >
              {verifyingOtp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Verify"
              )}
            </button>
          </div>

          {otpErr && (
            <div className="text-[11px] text-red-600 font-medium">
              {otpErr}
            </div>
          )}
        </div>
      )}

      {/* Password & Confirm Password (disabled until email is verified) */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password">
          <input
            type="password"
            required
            disabled={!isEmailVerified}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            required
            disabled={!isEmailVerified}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#2B5CE6] focus:ring-2 focus:ring-[#2B5CE6]/15 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: "#E1E4EA", color: "#0F172A" }}
          />
        </Field>
      </div>

      {!isEmailVerified && (
        <p className="text-[11px] text-gray-400 -mt-2">
          Validate your email above to set your password.
        </p>
      )}

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
        disabled={loading || !isEmailVerified}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "#2B5CE6", boxShadow: "0 10px 30px -12px rgba(43,92,230,0.6)" }}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <>
            <span>Create Account</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
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
