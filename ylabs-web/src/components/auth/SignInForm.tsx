import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { useGoogleLogin } from "@react-oauth/google";
import { PasswordField } from "./PasswordField";
import { OtpInput, OtpInputHandle } from "./OtpInput";
import { showToast } from "./toastService";
import type { AuthTab } from "./types";
import { analytics, GA4_EVENTS } from "@/services/analytics";

interface SignInFormProps {
  redirectUrl?: string;
  onNavigateTab: (tab: AuthTab) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;

interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

function getApiError(err: unknown, fallback: string): string {
  const e = err as ApiErrorResponse;
  return (
    e?.response?.data?.detail ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

type SignInMode = "password" | "otp";
type OtpStep = "email" | "code" | "done";

const maskEmail = (email: string) =>
  email.replace(/^(.).*(@.*)$/, "$1***$2");

export function SignInForm({ redirectUrl, onNavigateTab }: SignInFormProps) {
  const { login } = useAuth();

  // ── Shared state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<SignInMode>("password");
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Password mode state ───────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ── OTP mode state ────────────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpHasError, setOtpHasError] = useState(false);
  const [otpErrMsg, setOtpErrMsg] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<OtpInputHandle>(null);

  // ── Resend cooldown timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Redirect after OTP "done" step ───────────────────────────────────────
  useEffect(() => {
    if (otpStep !== "done") return;
    const dest = resolveDestination(undefined, redirectUrl);
    const t = setTimeout(() => { window.location.href = dest; }, 1200);
    return () => clearTimeout(t);
  }, [otpStep]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resolveDestination = (role: string | undefined, redirectUrl?: string) => {
    const r = role?.toLowerCase();
    const defaultDest =
      r === "admin" ? "/admin" :
      r === "recruiter" ? "/recruiter/dashboard" :
      "/student/dashboard";
    const isSafe = redirectUrl && redirectUrl !== "/" && !redirectUrl.startsWith("/auth");
    return isSafe ? redirectUrl : defaultDest;
  };

  const switchMode = (next: SignInMode) => {
    setMode(next);
    setEmail("");
    setPassword("");
    setEmailErr(false);
    setPwErr(false);
    setServerErr("");
    setOtpStep("email");
    setOtpCode("");
    setOtpHasError(false);
    setOtpErrMsg("");
    setOtpAttempts(0);
    setResendCooldown(0);
  };

  // ── Google login ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setServerErr("");
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle(tokenResponse.access_token);
      login(res.user, res.access);
      const role = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "google", role: role?.toLowerCase() });
      window.location.href = resolveDestination(role, redirectUrl);
    } catch (err) {
      setServerErr("Google sign in was unsuccessful. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setServerErr("Google sign in was cancelled or failed."),
  });

  const handleGithubClick = () => showToast("GitHub sign in is coming soon.");

  // ══════════════════════════════════════════════════════════════════════════
  //  PASSWORD MODE
  // ══════════════════════════════════════════════════════════════════════════
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const isEmailValid = EMAIL_REGEX.test(email.trim());
    const isPwValid = password.length > 0;
    setEmailErr(!isEmailValid);
    setPwErr(!isPwValid);

    if (!isEmailValid) { emailInputRef.current?.focus(); return; }
    if (!isPwValid)    { passwordInputRef.current?.focus(); return; }

    setIsLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
      if (res.user?.id) localStorage.removeItem(`is_first_login_${res.user.id}`);
      login(res.user, res.access);
      const role = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "email", role: role?.toLowerCase() });
      window.location.href = resolveDestination(role, redirectUrl);
    } catch (err) {
      setServerErr(getApiError(err, "Incorrect email or password."));
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  OTP MODE — Step 1: email
  // ══════════════════════════════════════════════════════════════════════════
  const handleOtpEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const isEmailValid = EMAIL_REGEX.test(email.trim());
    setEmailErr(!isEmailValid);
    if (!isEmailValid) return;

    setIsLoading(true);
    try {
      await authService.sendLoginOtp(email.trim());
      setOtpCode("");
      setOtpHasError(false);
      setOtpErrMsg("");
      setOtpAttempts(0);
      setResendCooldown(RESEND_SECONDS);
      setOtpStep("code");
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      setServerErr(getApiError(err, "We couldn't send the code. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP Mode — Step 2: verify code ────────────────────────────────────────
  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6 || isLoading) return;
    if (otpAttempts >= MAX_OTP_ATTEMPTS) return;

    setIsLoading(true);
    setOtpHasError(false);
    setOtpErrMsg("");

    try {
      const res = await authService.verifyLoginOtp(email.trim(), code);
      if (res.user) login(res.user, res.access);
      const role = res.user?.roles?.ylabs || res.user?.roles?.ycode || res.user?.role;
      analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "otp", role: role?.toLowerCase() });
      setOtpStep("done");
    } catch (err) {
      const used = otpAttempts + 1;
      const left = MAX_OTP_ATTEMPTS - used;
      setOtpAttempts(used);
      setOtpCode("");
      setOtpHasError(true);
      setOtpErrMsg(
        used >= MAX_OTP_ATTEMPTS
          ? "Too many incorrect attempts. Request a new code."
          : `That code isn't right. ${left} ${left === 1 ? "attempt" : "attempts"} left.`
      );
      if (used < MAX_OTP_ATTEMPTS) setTimeout(() => otpRef.current?.focus(), 50);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (val: string) => {
    setOtpCode(val);
    setOtpHasError(false);
    // Auto-submit when all 6 digits are filled
    if (val.length === 6) handleVerifyOtp(val);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtpCode("");
    setOtpHasError(false);
    setOtpErrMsg("");
    setOtpAttempts(0);
    setResendCooldown(RESEND_SECONDS);
    try {
      await authService.sendLoginOtp(email.trim());
      showToast("New code sent to your email");
      otpRef.current?.focus();
    } catch {
      showToast("Couldn't resend the code. Please try again.");
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER — OTP "done" state
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === "otp" && otpStep === "done") {
    return (
      <div className="form in done">
        <svg className="ck" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="24" />
          <path d="M22 32l7 7 13-13" />
        </svg>
        <h2>You're logged in</h2>
        <p className="sub">Taking you to your dashboard…</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER — OTP code step
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === "otp" && otpStep === "code") {
    const locked = otpAttempts >= MAX_OTP_ATTEMPTS;
    return (
      <div className="form in">
        <h2>Check your email</h2>
        <p className="sub">
          We sent a 6-digit code to <b>{maskEmail(email.trim())}</b>. Enter it below to log in.
        </p>

        <div className="otpb">
          <OtpInput
            ref={otpRef}
            id="otpLogin"
            value={otpCode}
            onChange={handleOtpChange}
            hasError={otpHasError}
            disabled={isLoading || locked}
          />
          <div className="rs">
            <button
              type="button"
              className="lnk"
              disabled={resendCooldown > 0 || locked}
              onClick={handleResend}
            >
              Resend code
            </button>
            {resendCooldown > 0 && (
              <span>Resend in {resendCooldown}s</span>
            )}
          </div>
        </div>

        <div className={`otperr ${otpHasError ? "show" : ""}`}>{otpErrMsg}</div>

        <button
          type="button"
          className={`go ${isLoading ? "load" : ""}`}
          disabled={otpCode.length !== 6 || isLoading || locked}
          onClick={() => handleVerifyOtp(otpCode)}
        >
          <span className="sp" />
          <span>{isLoading ? "Verifying…" : "Verify and log in"}</span>
        </button>

        <div className="foot">
          <button
            type="button"
            className="back"
            onClick={() => { setOtpStep("email"); setOtpHasError(false); setServerErr(""); }}
          >
            ← Use a different email
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER — OTP email step
  // ══════════════════════════════════════════════════════════════════════════
  if (mode === "otp" && otpStep === "email") {
    return (
      <form className="form in" onSubmit={handleOtpEmailSubmit} noValidate>
        <h2>Log in to your account</h2>
        <p className="sub">Enter your work email and we'll send you a one-time code. No password needed.</p>

        {serverErr && (
          <div
            style={{ background: "#fef2f2", border: "1px solid #fee2e2", color: "#d6372c",
              borderRadius: "8px", padding: "10px 14px", fontSize: "13.5px", marginBottom: "18px" }}
            role="alert"
          >
            {serverErr}
          </div>
        )}

        <div className={`f ${emailErr ? "has-err" : ""}`}>
          <label htmlFor="otpEmail">Email Address</label>
          <div className={`inp ${emailErr ? "err" : ""}`}>
            <input
              id="otpEmail"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr(false); }}
            />
          </div>
          <div className="msg">Enter a valid email address.</div>
        </div>

        <button
          className={`go ${isLoading ? "load" : ""}`}
          type="submit"
          disabled={isLoading}
        >
          <span className="sp" />
          <span>{isLoading ? "Sending code…" : "Continue"}</span>
        </button>

        <div className="or">or</div>

        <button
          type="button"
          className="go-sec"
          onClick={() => switchMode("password")}
        >
          Log in with password
        </button>

        <div className="foot">
          <p>
            Don't have an account?{" "}
            <button type="button" className="lnk" onClick={() => onNavigateTab("signup")}>
              Create an account
            </button>
          </p>
        </div>
      </form>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER — Password mode (default)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <form className="form in" onSubmit={handlePasswordSubmit} noValidate>
      <h2>Sign in to Yuvro Labs</h2>
      <p className="sub">Welcome back. Enter your details to continue.</p>

      {serverErr && (
        <div
          style={{ background: "#fef2f2", border: "1px solid #fee2e2", color: "#d6372c",
            borderRadius: "8px", padding: "10px 14px", fontSize: "13.5px", marginBottom: "18px" }}
          role="alert"
        >
          {serverErr}
        </div>
      )}

      <div className={`f ${emailErr ? "has-err" : ""}`}>
        <label htmlFor="email">Email Address</label>
        <div className={`inp ${emailErr ? "err" : ""}`} id="eWrap">
          <input
            ref={emailInputRef}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr(false); }}
          />
        </div>
        <div className="msg">Enter a valid email address.</div>
      </div>

      <div className={`f ${pwErr ? "has-err" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <label htmlFor="pw" style={{ margin: 0 }}>Password</label>
          <button type="button" className="lnk" style={{ fontSize: "13.5px" }} onClick={() => onNavigateTab("forgot")}>
            Forgot password?
          </button>
        </div>
        <PasswordField
          ref={passwordInputRef}
          id="pw"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          hasError={pwErr}
          onChange={(e) => { setPassword(e.target.value); if (pwErr) setPwErr(false); }}
        />
        <div className="msg">Enter your password.</div>
      </div>

      <button className={`go ${isLoading ? "load" : ""}`} type="submit" disabled={isLoading}>
        <span className="sp" />
        <span>{isLoading ? "Signing in…" : "Sign In"}</span>
      </button>

      <div className="or">or continue with</div>

      {/* One-time code option */}
      <button
        type="button"
        className="go-sec"
        onClick={() => switchMode("otp")}
      >
        Log in with a one-time code
      </button>

      {/* Social logins */}
      <div className="soc" style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => triggerGoogleLogin()}
          aria-label="Continue with Google"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
          </svg>
          Google
        </button>

        <button type="button" onClick={handleGithubClick} aria-label="Continue with GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#171c2e" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.3 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5z" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="foot">
        <p>
          Don't have an account?{" "}
          <button type="button" className="lnk" onClick={() => onNavigateTab("signup")}>
            Create an account
          </button>
        </p>
      </div>
    </form>
  );
}
