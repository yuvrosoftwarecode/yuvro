import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { getPasswordStrength } from "@/lib/validators";
import { PasswordField } from "./PasswordField";
import { OtpInput, OtpInputHandle } from "./OtpInput";
import { SuccessView } from "./SuccessView";
import { showToast } from "./toastService";
import type { AuthTab } from "./types";

interface ForgotFlowProps {
  initialUidb64?: string;
  initialToken?: string;
  redirectUrl?: string;
  onNavigateTab: (tab: AuthTab) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const maskEmail = (email: string) => {
  return email.replace(/^(.).*(@.*)$/, "$1***$2");
};

type ForgotSubStep = "initial" | "link" | "code" | "new_password" | "done";

export function ForgotFlow({ initialUidb64, initialToken, redirectUrl, onNavigateTab }: ForgotFlowProps) {
  const { login } = useAuth();
  const [subStep, setSubStep] = useState<ForgotSubStep>(() =>
    initialUidb64 && initialToken ? "new_password" : "initial",
  );

  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"link" | "otp">("link");
  const [emailErr, setEmailErr] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Link step countdown
  const [linkCooldown, setLinkCooldown] = useState(0);

  // Code step state
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState(false);
  const [codeErrMsg, setCodeErrMsg] = useState("That code isn’t correct. Check it and try again.");
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [resetToken, setResetToken] = useState("");
  const [resetUid, setResetUid] = useState("");
  const otpRef = useRef<OtpInputHandle>(null);

  // New password step state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);
  const newPwRef = useRef<HTMLInputElement>(null);
  const confirmPwRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Cooldown timers
  useEffect(() => {
    if (linkCooldown > 0) {
      const timer = setInterval(() => {
        setLinkCooldown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [linkCooldown]);

  useEffect(() => {
    if (codeCooldown > 0) {
      const timer = setInterval(() => {
        setCodeCooldown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [codeCooldown]);

  // Step 1: Initial method select submit
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const isEmailOk = EMAIL_REGEX.test(email.trim());
    setEmailErr(!isEmailOk);

    if (!isEmailOk) {
      emailInputRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      if (method === "link") {
        // Send reset link
        await authService.forgotPassword(email.trim());
        setLinkCooldown(30);
        setSubStep("link");
      } else {
        // Send 6-digit code
        await authService.sendForgotPasswordCode(email.trim());
        setCode("");
        setCodeErr(false);
        setCodeCooldown(30);
        setSubStep("code");
        setTimeout(() => {
          otpRef.current?.focus();
        }, 100);
      }
    } catch (err: any) {
      if (err?.status === 400 && err?.message) {
        setServerErr(err.message);
      } else {
        // Avoid account enumeration: show success regardless
        if (method === "link") {
          setLinkCooldown(30);
          setSubStep("link");
        } else {
          setCode("");
          setCodeErr(false);
          setCodeCooldown(30);
          setSubStep("code");
          setTimeout(() => {
            otpRef.current?.focus();
          }, 100);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend reset link
  const handleResendLink = async () => {
    try {
      await authService.forgotPassword(email.trim());
      setLinkCooldown(30);
      showToast("Reset link sent again");
    } catch {
      setLinkCooldown(30);
      showToast("Reset link sent again");
    }
  };

  // Resend reset code
  const handleResendCode = async () => {
    try {
      await authService.sendForgotPasswordCode(email.trim());
      setCodeCooldown(30);
      setCode("");
      setCodeErr(false);
      showToast("New code sent to your email");
      otpRef.current?.focus();
    } catch {
      setCodeCooldown(30);
      setCode("");
      setCodeErr(false);
      showToast("New code sent to your email");
      otpRef.current?.focus();
    }
  };

  // Verify Code
  const handleVerifyCode = async () => {
    setCodeErr(false);
    setIsLoading(true);

    try {
      const res = await authService.verifyForgotPasswordCode(email.trim(), code);
      if (res?.token) setResetToken(res.token);
      if (res?.uidb64) setResetUid(res.uidb64);
      setSubStep("new_password");
      setTimeout(() => {
        newPwRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setCodeErr(true);
      const msg =
        err?.details?.error ||
        err?.details?.detail ||
        err?.message ||
        "That code isn’t correct. Check it and try again.";
      setCodeErrMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit New Password
  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerErr("");

    const isPwOk = STRONG_PW_REGEX.test(newPassword);
    const isConfirmOk = confirmPassword.length > 0 && confirmPassword === newPassword;

    setPwErr(!isPwOk);
    setConfirmErr(!isConfirmOk);

    if (!isPwOk) {
      newPwRef.current?.focus();
      return;
    }
    if (!isConfirmOk) {
      confirmPwRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      let res: any;
      if (initialUidb64 && initialToken) {
        // Reset via reset link
        res = await authService.resetPassword(initialUidb64, initialToken, newPassword);
      } else {
        // Reset via code
        res = await authService.resetPasswordWithCode(
          email.trim(),
          code,
          newPassword,
          resetToken,
          resetUid,
        );
      }

      if (res?.user && res?.access) {
        login(res.user, res.access);
        if (res.user.id) {
          localStorage.removeItem(`is_first_login_${res.user.id}`);
        }
      }

      setNewPassword("");
      setConfirmPassword("");
      setSubStep("done");

      // Auto signin: smoothly redirect to destination
      const role = res?.user?.roles?.ylabs || res?.user?.roles?.ycode || res?.user?.role;
      const r = role?.toLowerCase();
      const defaultDest =
        r === "admin"
          ? "/admin"
          : r === "recruiter"
            ? "/recruiter/dashboard"
            : "/student/dashboard";
      const target = redirectUrl || defaultDest;

      setTimeout(() => {
        window.location.href = target;
      }, 1000);
    } catch (err: any) {
      const msg =
        err?.details?.error ||
        err?.details?.detail ||
        err?.message ||
        "Failed to reset password. The link or code may have expired.";
      setServerErr(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Success view
  if (subStep === "done") {
    const defaultDest = "/student/dashboard";
    const target = redirectUrl || defaultDest;

    return (
      <SuccessView
        title="Password updated"
        message="Your password has been reset. Signing you in…"
        buttonText="Continue"
        onButtonClick={() => {
          window.location.href = target;
        }}
      />
    );
  }

  // Create new password view
  if (subStep === "new_password") {
    const pwStrength = getPasswordStrength(newPassword);

    return (
      <form className="form su in" onSubmit={handleNewPasswordSubmit} noValidate>
        <h2>Create a new password</h2>
        <p className="sub">Choose a strong password you haven’t used before.</p>

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

        <div className={`f ${pwErr ? "has-err" : ""}`}>
          <label htmlFor="fpPw">New password</label>
          <PasswordField
            ref={newPwRef}
            id="fpPw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            hasError={pwErr}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (pwErr) setPwErr(false);
            }}
          />

          {/* Password strength meter */}
          {newPassword.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", gap: "4px", height: "3px", marginBottom: "6px" }}>
                <span
                  style={{
                    flex: 1,
                    borderRadius: "3px",
                    background:
                      pwStrength.score >= 1
                        ? pwStrength.score === 1
                          ? "#cf222e"
                          : pwStrength.score === 2
                          ? "#d29922"
                          : "#2da44e"
                        : "#e1e4ea",
                    transition: "background 0.2s ease",
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    borderRadius: "3px",
                    background:
                      pwStrength.score >= 2
                        ? pwStrength.score === 2
                          ? "#d29922"
                          : "#2da44e"
                        : "#e1e4ea",
                    transition: "background 0.2s ease",
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    borderRadius: "3px",
                    background: pwStrength.score >= 3 ? "#2da44e" : "#e1e4ea",
                    transition: "background 0.2s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color:
                    pwStrength.score >= 3
                      ? "#2da44e"
                      : pwStrength.score === 2
                      ? "#d29922"
                      : "#cf222e",
                  fontWeight: 500,
                }}
              >
                Password strength: {pwStrength.label}
              </div>
            </div>
          )}

          {/* Requirements checklist */}
          <div
            style={{
              marginTop: "8px",
              fontSize: "12.5px",
              color: "var(--auth-muted)",
              lineHeight: "20px",
            }}
          >
            <div style={{ color: pwStrength.hasLength ? "#2da44e" : "var(--auth-muted)" }}>
              {pwStrength.hasLength ? "✓" : "○"} At least 8 characters
            </div>
            <div style={{ color: pwStrength.hasLetter ? "#2da44e" : "var(--auth-muted)" }}>
              {pwStrength.hasLetter ? "✓" : "○"} Contains at least one letter
            </div>
            <div style={{ color: pwStrength.hasNumber ? "#2da44e" : "var(--auth-muted)" }}>
              {pwStrength.hasNumber ? "✓" : "○"} Contains at least one number
            </div>
          </div>

          <div className="msg">Use 8 or more characters with a letter and a number.</div>
        </div>

        <div className={`f ${confirmErr ? "has-err" : ""}`}>
          <label htmlFor="fpPw2">Confirm new password</label>
          <PasswordField
            ref={confirmPwRef}
            id="fpPw2"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            hasError={confirmErr}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmErr) setConfirmErr(false);
            }}
          />
          <div className="msg">Passwords don’t match.</div>
        </div>

        <button
          className={`go ${isLoading ? "load" : ""}`}
          type="submit"
          disabled={isLoading}
          style={{ marginTop: "6px" }}
        >
          <span className="sp" />
          <span>{isLoading ? "Resetting…" : "Reset password"}</span>
        </button>

        <div className="foot">
          <button type="button" className="back" onClick={() => onNavigateTab("signin")}>
            ← Back to sign in
          </button>
        </div>
      </form>
    );
  }

  // Code entry view
  if (subStep === "code") {
    return (
      <div className="form in">
        <h2>Enter the code</h2>
        <p className="sub">
          We sent a 6-digit code to <b>{maskEmail(email)}</b>.
        </p>

        <div className="otpb" style={{ marginBottom: "14px" }}>
          <OtpInput
            ref={otpRef}
            id="otpF"
            value={code}
            onChange={(val) => {
              setCode(val);
              if (codeErr) setCodeErr(false);
            }}
            hasError={codeErr}
            disabled={isLoading}
          />
          <div className="rs">
            <button
              type="button"
              className="lnk"
              disabled={codeCooldown > 0}
              onClick={handleResendCode}
            >
              Resend code
            </button>
            {codeCooldown > 0 && <span>Resend in {codeCooldown}s</span>}
          </div>
        </div>

        <div className={`otperr ${codeErr ? "show" : ""}`}>{codeErrMsg}</div>

        <button
          className={`go ${isLoading ? "load" : ""}`}
          type="button"
          disabled={code.length !== 6 || isLoading}
          onClick={handleVerifyCode}
        >
          <span className="sp" />
          <span>{isLoading ? "Verifying…" : "Verify code"}</span>
        </button>

        <p className="hint" style={{ textAlign: "center" }}>
          Wrong email?{" "}
          <button type="button" className="lnk" onClick={() => setSubStep("initial")}>
            Use a different email
          </button>
        </p>

        <div className="foot">
          <button type="button" className="back" onClick={() => onNavigateTab("signin")}>
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Link sent view
  if (subStep === "link") {
    return (
      <div className="form in">
        <div className="mi">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
          </svg>
        </div>
        <h2>Check your email</h2>
        <p className="sub">
          We sent a password reset link to <b>{maskEmail(email)}</b>. It can take a minute to
          arrive.
        </p>

        <div className="sec">
          <button
            type="button"
            className="lnk"
            disabled={linkCooldown > 0}
            onClick={handleResendLink}
          >
            Resend link
          </button>
          {linkCooldown > 0 && <span>Resend in {linkCooldown}s</span>}
        </div>

        <p className="hint">
          Wrong email?{" "}
          <button type="button" className="lnk" onClick={() => setSubStep("initial")}>
            Use a different email
          </button>
        </p>

        <div className="foot">
          <button type="button" className="back" onClick={() => onNavigateTab("signin")}>
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Initial Method Select Form
  return (
    <form className="form in" onSubmit={handleInitialSubmit} noValidate>
      <h2>Forgot your password?</h2>
      <p className="sub">Enter your email and choose how you’d like to reset it.</p>

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
        <label htmlFor="fpEmail">Email Address</label>
        <div className={`inp ${emailErr ? "err" : ""}`}>
          <input
            ref={emailInputRef}
            id="fpEmail"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailErr) setEmailErr(false);
            }}
          />
        </div>
        <div className="msg">Enter a valid email address.</div>
      </div>

      <label className="opt">
        <input
          type="radio"
          name="fpm"
          value="link"
          checked={method === "link"}
          onChange={() => setMethod("link")}
        />
        <i />
        <div>
          <b>Send me a reset link</b>
          <span>Open the link in your email to set a new password.</span>
        </div>
      </label>

      <label className="opt">
        <input
          type="radio"
          name="fpm"
          value="otp"
          checked={method === "otp"}
          onChange={() => setMethod("otp")}
        />
        <i />
        <div>
          <b>Send me a 6-digit code</b>
          <span>Enter the code here to set a new password.</span>
        </div>
      </label>

      <button
        className={`go ${isLoading ? "load" : ""}`}
        type="submit"
        disabled={isLoading}
        style={{ marginTop: "12px" }}
      >
        <span className="sp" />
        <span>{isLoading ? "Continuing…" : "Continue"}</span>
      </button>

      <div className="foot">
        <button type="button" className="back" onClick={() => onNavigateTab("signin")}>
          ← Back to sign in
        </button>
      </div>
    </form>
  );
}
