import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import { useEmailAvailability } from "@/hooks/useEmailAvailability";
import { validateUsernameFormat, getPasswordStrength } from "@/lib/validators";
import { PasswordField } from "./PasswordField";
import { OtpInput, OtpInputHandle } from "./OtpInput";
import { SuccessView } from "./SuccessView";
import { COUNTRY_CODES } from "./constants";
import YuvroLogo from "@/assets/YuvroLogo.png";
import type { AuthTab } from "./types";

interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: string;
      error?: string;
      email?: string[];
      username?: string[];
    };
    status?: number;
  };
  message?: string;
}

interface SignUpFlowProps {
  redirectUrl?: string;
  onNavigateTab: (tab: AuthTab) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const isPhoneValid = (cc: string, phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (cc === "+91") {
    return /^[6-9]\d{9}$/.test(digits);
  }
  return digits.length >= 7 && digits.length <= 14;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function StatusIcon({
  status,
  label,
  hasValue,
}: {
  status: "idle" | "checking" | "available" | "taken" | "invalid" | "error";
  label: string;
  hasValue: boolean;
}) {
  if (status === "checking") {
    return (
      <span
        className="un-icon"
        aria-label={`Checking ${label} availability`}
        style={{ width: 20, height: 20, background: "transparent" }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid #dadfe9",
            borderTopColor: "var(--auth-blue, #2563eb)",
            animation: "auth-spin 0.7s linear infinite",
          }}
        />
        <img
          src={YuvroLogo}
          alt="Yuvro"
          style={{
            width: 11,
            height: 11,
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 1,
          }}
        />
      </span>
    );
  }
  if (status === "available") {
    return (
      <span
        className="un-icon"
        aria-label={`${label} available`}
        style={{ width: 18, height: 18, background: "transparent" }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="8" fill="#1f883d" />
          <path
            d="M4.5 8.2l2.3 2.3 4.7-4.7"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if ((status === "taken" || status === "invalid") && hasValue) {
    return (
      <span className="un-icon err" aria-label={`${label} error`}>
        ✕
      </span>
    );
  }
  return null;
}

export function SignUpFlow({ redirectUrl, onNavigateTab }: SignUpFlowProps) {
  const { login } = useAuth();

  // Current sub-step:
  // 1 = Account Information
  // 2 = Email Verification
  // 3 = Account Security (Password)
  // 4 = Registration Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form details - preserved across steps
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedCountryIso, setSelectedCountryIso] = useState("IN");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 1 Validation errors
  const [emailErr, setEmailErr] = useState(false);
  const [nameErr, setNameErr] = useState(false);
  const [usernameErr, setUsernameErr] = useState(false);
  const [phoneErr, setPhoneErr] = useState(false);
  const [step1ServerErr, setStep1ServerErr] = useState("");

  // Step 3 Validation errors
  const [pwErr, setPwErr] = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);
  const [step3ServerErr, setStep3ServerErr] = useState("");

  // Refs for focusing inputs
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const otpEmailRef = useRef<OtpInputHandle>(null);

  // Real-time asynchronous availability hooks
  const {
    status: emailStatus,
    message: emailMsg,
    isAvailable: isEmailAvailable,
  } = useEmailAvailability(email, 300);

  const {
    status: usernameStatus,
    message: usernameMsg,
    isAvailable: isUsernameAvailable,
  } = useUsernameAvailability(username, 300);

  // Step 2 OTP Verification State
  const [emailCode, setEmailCode] = useState("");
  const [otpHasError, setOtpHasError] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  // Timers & rate limits
  const [emailCooldown, setEmailCooldown] = useState(0); // 30s resend cooldown
  const [otpExpiresIn, setOtpExpiresIn] = useState(300); // 5 minutes expiration (300s)
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Loading states
  const [isSubmittingStep1, setIsSubmittingStep1] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (emailCooldown > 0) {
      const timer = setInterval(() => {
        setEmailCooldown((c) => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [emailCooldown]);

  // 5-minute OTP expiration timer
  useEffect(() => {
    if (step === 2 && otpExpiresIn > 0) {
      const timer = setInterval(() => {
        setOtpExpiresIn((prev) => {
          if (prev <= 1) {
            setOtpHasError(true);
            setOtpErrorMessage("Verification code expired. Please request a new code.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, otpExpiresIn]);

  // Invalidate verification if email changes
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailErr) setEmailErr(false);
    if (verifiedEmail && val.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      setVerifiedEmail(null);
    }
  };

  // ==========================================
  // Step 1: Account Information Submission
  // ==========================================
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1ServerErr("");

    const trimmedEmail = email.trim();
    const isEmailFormatOk = EMAIL_REGEX.test(trimmedEmail);
    const hasEmailErr =
      !isEmailFormatOk || emailStatus === "invalid" || emailStatus === "taken";

    const isNameOk = name.trim().length >= 2;

    const trimmedUsername = username.trim();
    const isUsernameFormatOk =
      trimmedUsername.length >= 3 &&
      validateUsernameFormat(trimmedUsername, { minLen: 3, maxLen: 39 }).isValid;
    const hasUsernameErr =
      !isUsernameFormatOk || usernameStatus === "invalid" || usernameStatus === "taken";

    const isPhoneOk = isPhoneValid(countryCode, phone);

    setEmailErr(hasEmailErr);
    setNameErr(!isNameOk);
    setUsernameErr(hasUsernameErr);
    setPhoneErr(!isPhoneOk);

    if (hasEmailErr) {
      emailRef.current?.focus();
      return;
    }
    if (!isNameOk) {
      nameRef.current?.focus();
      return;
    }
    if (hasUsernameErr) {
      usernameRef.current?.focus();
      return;
    }
    if (!isPhoneOk) {
      phoneRef.current?.focus();
      return;
    }

    setIsSubmittingStep1(true);
    try {
      // Authoritative check for email availability if not already cached
      if (!isEmailAvailable) {
        const checkEmailRes = await authService.checkEmail(trimmedEmail);
        if (!checkEmailRes.available) {
          setEmailErr(true);
          setStep1ServerErr(
            checkEmailRes.message ||
              "The email you have provided is already associated with an account."
          );
          emailRef.current?.focus();
          return;
        }
      }

      // Authoritative check for username availability if not already cached
      if (!isUsernameAvailable) {
        const checkUserRes = await authService.checkUsername(trimmedUsername);
        if (!checkUserRes.available) {
          setUsernameErr(true);
          setStep1ServerErr(checkUserRes.message || "Username is already taken.");
          usernameRef.current?.focus();
          return;
        }
      }

      // Send 6-digit verification code to email
      await authService.sendSignupOtp(trimmedEmail);

      // Initialize OTP state for Step 2
      setEmailCode("");
      setOtpHasError(false);
      setOtpErrorMessage("");
      setFailedAttempts(0);
      setEmailCooldown(30);
      setOtpExpiresIn(300); // 5-minute expiration countdown

      setStep(2);
      setTimeout(() => {
        otpEmailRef.current?.focus();
      }, 100);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const msg =
        apiErr?.response?.data?.error ||
        apiErr?.response?.data?.detail ||
        apiErr?.message ||
        "Failed to send verification code. Please check your details and try again.";
      setStep1ServerErr(msg);
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  // ==========================================
  // Step 2: Resend OTP
  // ==========================================
  const handleResendEmail = async () => {
    if (emailCooldown > 0) return;
    try {
      await authService.sendSignupOtp(email.trim());
      setEmailCooldown(30);
      setOtpExpiresIn(300); // Reset 5-minute countdown
      setEmailCode("");
      setOtpHasError(false);
      setOtpErrorMessage("");
      setFailedAttempts(0);
      otpEmailRef.current?.focus();
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      setOtpHasError(true);
      setOtpErrorMessage(apiErr?.message || "Failed to resend code. Please try again.");
    }
  };

  // ==========================================
  // Step 2: Email OTP Verification
  // ==========================================
  const handleVerifyOtp = async () => {
    if (emailCode.length !== 6 || isVerifying) return;

    if (otpExpiresIn === 0) {
      setOtpHasError(true);
      setOtpErrorMessage("Verification code expired. Please request a new code.");
      return;
    }

    if (failedAttempts >= 5) {
      setOtpHasError(true);
      setOtpErrorMessage("Too many incorrect attempts. Please request a new code.");
      return;
    }

    setOtpHasError(false);
    setIsVerifying(true);

    try {
      await authService.verifySignupOtp(email.trim(), emailCode.trim());

      // Mark email as verified and advance to Step 3
      setVerifiedEmail(email.trim());
      setStep(3);
      setTimeout(() => {
        pwRef.current?.focus();
      }, 100);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setOtpHasError(true);

      if (newAttempts >= 5) {
        setOtpErrorMessage("Too many incorrect attempts. Please request a new code.");
      } else {
        const msg =
          apiErr?.response?.data?.error ||
          apiErr?.response?.data?.detail ||
          apiErr?.message ||
          "That code isn’t correct. Check it and try again.";
        setOtpErrorMessage(msg);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ==========================================
  // Step 3: Account Security & Final Registration
  // ==========================================
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3ServerErr("");

    const isPwOk = STRONG_PW_REGEX.test(password);
    const isConfirmOk = confirmPassword.length > 0 && confirmPassword === password;

    setPwErr(!isPwOk);
    setConfirmErr(!isConfirmOk);

    if (!isPwOk) {
      pwRef.current?.focus();
      return;
    }
    if (!isConfirmOk) {
      confirmRef.current?.focus();
      return;
    }

    // Ensure email verification is completed
    if (!verifiedEmail || verifiedEmail.toLowerCase() !== email.trim().toLowerCase()) {
      setStep(2);
      setOtpHasError(true);
      setOtpErrorMessage("Please verify your email address before creating your account.");
      return;
    }

    setIsCreatingAccount(true);
    try {
      const names = name.trim().split(/\s+/);
      const firstName = names.shift() || "";
      const lastName = names.join(" ");

      const loginResponse = await authService.register({
        email: email.trim(),
        username: username.trim(),
        first_name: firstName,
        last_name: lastName,
        password,
        password_confirm: confirmPassword,
        phone: `${countryCode} ${phone.replace(/\D/g, "")}`,
        country_code: countryCode,
        roles: { ylabs: "student" },
      });

      if (loginResponse?.user) {
        login(loginResponse.user, loginResponse.access);
        if (loginResponse.user.id) {
          localStorage.setItem(`is_first_login_${loginResponse.user.id}`, "true");
        }
      }

      setStep(4);
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      const data = apiErr?.response?.data;
      const msg =
        (Array.isArray(data?.email) ? data?.email[0] : null) ||
        (Array.isArray(data?.username) ? data?.username[0] : null) ||
        data?.error ||
        data?.detail ||
        apiErr?.message ||
        "Failed to create account. Please try again.";
      setStep3ServerErr(msg);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  // Step 4: Continue action after registration
  const handleContinue = () => {
    const defaultDest = "/student/dashboard";
    const target = redirectUrl || defaultDest;
    window.location.href = target;
  };

  const firstName = name.trim().split(/\s+/)[0] || "there";
  const pwStrength = getPasswordStrength(password);

  // ==========================================
  // Render Step 4: Success View
  // ==========================================
  if (step === 4) {
    return (
      <SuccessView
        title="Account created"
        message={`Welcome, ${firstName}. Your account has been verified and created successfully.`}
        buttonText="Continue to Yuvro"
        onButtonClick={handleContinue}
      />
    );
  }

  // ==========================================
  // Render Step 2: Email Verification View
  // ==========================================
  if (step === 2) {
    const isVerifyDisabled =
      emailCode.length !== 6 || isVerifying || otpExpiresIn === 0 || failedAttempts >= 5;

    return (
      <div className="form su in">
        <p className="stp">Step 2 of 3</p>

        <h2>Verify your email</h2>
        <p className="sub">
          We sent a 6-digit verification code to <b>{email.trim()}</b>. Enter it below to continue.
        </p>

        {/* 6-Digit Email Code Input */}
        <div className="otpb">
          <div className="oh">
            <b>Email code</b>
            <span>
              {otpExpiresIn > 0 ? (
                <>Expires in {formatCountdown(otpExpiresIn)}</>
              ) : (
                <span style={{ color: "#cf222e" }}>Code expired</span>
              )}
            </span>
          </div>

          <OtpInput
            ref={otpEmailRef}
            id="otpEmail"
            value={emailCode}
            onChange={(val) => {
              setEmailCode(val);
              if (otpHasError) setOtpHasError(false);
            }}
            hasError={otpHasError}
            disabled={isVerifying || otpExpiresIn === 0}
          />

          <div className="rs">
            <button
              type="button"
              className="lnk"
              disabled={emailCooldown > 0}
              onClick={handleResendEmail}
            >
              Resend code
            </button>
            {emailCooldown > 0 && <span>Resend in {emailCooldown}s</span>}
          </div>
        </div>

        <div className={`otperr ${otpHasError ? "show" : ""}`}>{otpErrorMessage}</div>

        <button
          className={`go ${isVerifying ? "load" : ""}`}
          type="button"
          disabled={isVerifyDisabled}
          onClick={handleVerifyOtp}
        >
          <span className="sp" />
          <span>{isVerifying ? "Verifying…" : "Verify and continue"}</span>
        </button>

        <div className="foot">
          <button
            type="button"
            className="back"
            onClick={() => {
              setStep(1);
              setOtpHasError(false);
            }}
          >
            ← Edit my details
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render Step 3: Account Security (Password)
  // ==========================================
  if (step === 3) {
    return (
      <form className="form su in" onSubmit={handleStep3Submit} noValidate>
        <p className="stp">Step 3 of 3</p>

        <h2>Account security</h2>
        <p className="sub">Choose a strong password to protect your account.</p>

        {step3ServerErr && (
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
            {step3ServerErr}
          </div>
        )}

        {/* Create Password */}
        <div className={`f ${pwErr ? "has-err" : ""}`}>
          <label htmlFor="suPw">Create password</label>
          <PasswordField
            ref={pwRef}
            id="suPw"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            hasError={pwErr}
            onChange={(e) => {
              setPassword(e.target.value);
              if (pwErr) setPwErr(false);
            }}
          />

          {/* Password strength meter */}
          {password.length > 0 && (
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

        {/* Confirm Password */}
        <div className={`f ${confirmErr ? "has-err" : ""}`}>
          <label htmlFor="suPw2">Confirm password</label>
          <PasswordField
            ref={confirmRef}
            id="suPw2"
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
          className={`go ${isCreatingAccount ? "load" : ""}`}
          type="submit"
          disabled={isCreatingAccount}
          style={{ marginTop: "6px" }}
        >
          <span className="sp" />
          <span>{isCreatingAccount ? "Creating account…" : "Create an account"}</span>
        </button>

        <div className="foot">
          <button
            type="button"
            className="back"
            onClick={() => {
              setStep(2);
              setStep3ServerErr("");
            }}
          >
            ← Back to verification
          </button>
        </div>
      </form>
    );
  }

  // ==========================================
  // Render Step 1: Account Information View
  // Exact order: Email, Full Name, Username, Phone
  // ==========================================
  return (
    <form className="form su in" onSubmit={handleStep1Submit} noValidate>
      <p className="stp">Step 1 of 3</p>

      <h2>Create your account</h2>
      <p className="sub">Enter your account details to get started.</p>

      {step1ServerErr && (
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
          {step1ServerErr}
        </div>
      )}

      {/* 1. Email Address */}
      <div
        className={`f ${
          emailErr || emailStatus === "taken" || emailStatus === "invalid" ? "has-err" : ""
        }`}
      >
        <label htmlFor="suEmail">Email address</label>
        <div
          className={`inp ${
            emailErr || emailStatus === "taken" || emailStatus === "invalid"
              ? "err"
              : emailStatus === "available"
              ? "ok"
              : ""
          }`}
        >
          <input
            ref={emailRef}
            id="suEmail"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
          />
          <StatusIcon status={emailStatus} label="Email" hasValue={email.length > 0} />
        </div>

        {emailStatus === "taken" && (
          <div className="un-msg taken github-alert-msg" role="alert">
            <span className="alert-icon" aria-hidden="true">
              ⚠️
            </span>
            <span>
              The email you have provided is already associated with an account.{" "}
              <button
                type="button"
                className="auth-text-link"
                onClick={() => onNavigateTab("signin")}
              >
                Sign in
              </button>{" "}
              or{" "}
              <button
                type="button"
                className="auth-text-link"
                onClick={() => onNavigateTab("forgot")}
              >
                reset your password
              </button>
              .
            </span>
          </div>
        )}

        {emailStatus === "invalid" && (
          <div className="un-msg invalid">
            <span>Please enter a valid email address.</span>
          </div>
        )}

        {emailStatus === "error" && (
          <div className="un-msg error">
            <span>Unable to verify email. Check connection.</span>
          </div>
        )}

        {emailErr && emailStatus === "idle" && (
          <div className="msg">Enter a valid email address.</div>
        )}
      </div>

      {/* 2. Full Name */}
      <div className={`f ${nameErr ? "has-err" : ""}`}>
        <label htmlFor="suName">Full name</label>
        <div className={`inp ${nameErr ? "err" : ""}`}>
          <input
            ref={nameRef}
            id="suName"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameErr) setNameErr(false);
            }}
          />
        </div>
        <div className="msg">Enter your full name.</div>
      </div>

      {/* 3. Username */}
      <div
        className={`f ${
          usernameErr || usernameStatus === "taken" || usernameStatus === "invalid"
            ? "has-err"
            : ""
        }`}
      >
        <label htmlFor="suUsername">Username</label>
        <div
          className={`inp ${
            usernameErr || usernameStatus === "taken" || usernameStatus === "invalid"
              ? "err"
              : usernameStatus === "available"
              ? "ok"
              : ""
          }`}
        >
          <input
            ref={usernameRef}
            id="suUsername"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Choose a username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.replace(/\s+/g, ""));
              if (usernameErr) setUsernameErr(false);
            }}
          />
          <StatusIcon status={usernameStatus} label="Username" hasValue={username.length > 0} />
        </div>
        {usernameStatus !== "idle" && (
          <div className={`un-msg ${usernameStatus}`}>
            {usernameStatus === "checking" && <span>Checking availability…</span>}
            {usernameStatus === "available" && (
              <span>
                <span className="un-dot" /> {username} is available.
              </span>
            )}
            {usernameStatus === "taken" && (
              <span>
                <span className="un-dot" /> Username {username} is not available.
              </span>
            )}
            {usernameStatus === "invalid" && (
              <span>
                {usernameMsg ||
                  "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen."}
              </span>
            )}
            {usernameStatus === "error" && (
              <span>{usernameMsg || "Unable to verify username. Check connection."}</span>
            )}
          </div>
        )}
        {usernameStatus === "idle" && !usernameErr && (
          <div className="un-msg checking">
            Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.
          </div>
        )}
        {usernameErr && usernameStatus === "idle" && <div className="msg">Enter a username.</div>}
      </div>

      {/* 4. Mobile Number */}
      <div className={`f ${phoneErr ? "has-err" : ""}`}>
        <label htmlFor="suPhone">Mobile number</label>
        <div className={`inp ph ${phoneErr ? "err" : ""}`}>
          <select
            id="suCc"
            aria-label="Country code"
            value={selectedCountryIso}
            onChange={(e) => {
              const iso = e.target.value;
              setSelectedCountryIso(iso);
              const found = COUNTRY_CODES.find((item) => item.iso === iso);
              if (found) setCountryCode(found.code);
            }}
            style={{ width: "140px", maxWidth: "42%" }}
          >
            {COUNTRY_CODES.map((item) => (
              <option key={item.iso} value={item.iso}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
          <input
            ref={phoneRef}
            id="suPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d\s-]/g, "");
              setPhone(cleaned);
              if (phoneErr) setPhoneErr(false);
            }}
          />
        </div>
        <div className="msg">Enter a valid phone number.</div>
      </div>

      {/* Continue to Step 2 */}
      <button
        className={`go ${isSubmittingStep1 ? "load" : ""}`}
        type="submit"
        disabled={isSubmittingStep1}
        style={{ marginTop: "6px" }}
      >
        <span className="sp" />
        <span>{isSubmittingStep1 ? "Sending verification code…" : "Continue"}</span>
      </button>

      <div className="foot">
        <p>
          Already have an account?{" "}
          <button type="button" className="lnk" onClick={() => onNavigateTab("signin")}>
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
}
