import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { useGoogleLogin } from "@react-oauth/google";
import { PasswordField } from "./PasswordField";
import { showToast } from "./toastService";
import type { AuthTab } from "./types";

interface SignInFormProps {
  redirectUrl?: string;
  onNavigateTab: (tab: AuthTab) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function SignInForm({ redirectUrl, onNavigateTab }: SignInFormProps) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailErr, setEmailErr] = useState(false);
  const [pwErr, setPwErr] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setServerErr("");
    setIsLoading(true);
    try {
      const res = await authService.loginWithGoogle(tokenResponse.access_token);
      login(res.user, res.access);
      const role = res.user.roles?.ylabs || res.user.roles?.ycode || res.user.role;
      const r = role?.toLowerCase();
      const defaultDest =
        r === "admin"
          ? "/admin"
          : r === "recruiter"
            ? "/recruiter/dashboard"
            : "/student/dashboard";

      const isSafeRedirect =
        redirectUrl && redirectUrl !== "/" && !redirectUrl.startsWith("/auth");
      const target = isSafeRedirect ? redirectUrl : defaultDest;
      window.location.href = target;
    } catch (err: unknown) {
      console.error("Google sign-in error", err);
      setServerErr("Google sign in was unsuccessful. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setServerErr("Google sign in was cancelled or failed.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const isEmailValid = EMAIL_REGEX.test(email.trim());
    const isPwValid = password.length > 0;

    setEmailErr(!isEmailValid);
    setPwErr(!isPwValid);

    if (!isEmailValid) {
      emailInputRef.current?.focus();
      return;
    }
    if (!isPwValid) {
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login(email.trim(), password);
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

      const isSafeRedirect =
        redirectUrl && redirectUrl !== "/" && !redirectUrl.startsWith("/auth");
      const target = isSafeRedirect ? redirectUrl : defaultDest;
      window.location.href = target;
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setServerErr(
        apiErr?.response?.data?.detail ||
          apiErr?.response?.data?.error ||
          apiErr?.message ||
          "Invalid email or password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubClick = () => {
    showToast("GitHub sign in is coming soon.");
  };

  return (
    <form className="form in" onSubmit={handleSubmit} noValidate>
      <h2>Sign in to Yuvro Labs</h2>
      <p className="sub">Welcome back. Enter your details to continue.</p>

      {serverErr && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#d6372c",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13.5px",
            marginBottom: "18px",
          }}
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
            placeholder="student@test.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailErr) setEmailErr(false);
            }}
          />
        </div>
        <div className="msg">Enter a valid email address.</div>
      </div>

      <div className={`f ${pwErr ? "has-err" : ""}`}>
        <label htmlFor="pw">Password</label>
        <PasswordField
          ref={passwordInputRef}
          id="pw"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          hasError={pwErr}
          onChange={(e) => {
            setPassword(e.target.value);
            if (pwErr) setPwErr(false);
          }}
        />
        <div className="msg">Enter your password.</div>
      </div>

      <div className="row end">
        <button type="button" className="lnk" onClick={() => onNavigateTab("forgot")}>
          Forgot password?
        </button>
      </div>

      <button className={`go ${isLoading ? "load" : ""}`} type="submit" disabled={isLoading}>
        <span className="sp" />
        <span>{isLoading ? "Signing in…" : "Sign In"}</span>
      </button>

      <div className="or">or continue with</div>

      <div className="soc">
        <button
          type="button"
          onClick={() => {
            if (triggerGoogleLogin) {
              triggerGoogleLogin();
            } else {
              showToast("Google sign in not configured.");
            }
          }}
          aria-label="Continue with Google"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"
            />
            <path
              fill="#34A853"
              d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8z"
            />
            <path
              fill="#EA4335"
              d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4z"
            />
          </svg>
          Google
        </button>

        <button type="button" onClick={handleGithubClick} aria-label="Continue with GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#171c2e"
              d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.3 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6A11.5 11.5 0 0 0 12 .5z"
            />
          </svg>
          GitHub
        </button>
      </div>

      <div className="foot">
        <p>
          Don’t have an account?{" "}
          <button type="button" className="lnk" onClick={() => onNavigateTab("signup")}>
            Create an account
          </button>
        </p>
      </div>
    </form>
  );
}
