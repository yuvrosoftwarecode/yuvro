import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton } from "@/components/evaluation/EvalShell";
import { evaluationService } from "../services/evaluationService";
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";
import { authService } from "../services/authService";

export const Route = createFileRoute("/evaluation/otp")({
  head: () => ({
    meta: [{ title: "Verify — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: OtpPage,
});

function OtpPage() {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const evaluationId = searchParams.get("e") || "";
  const email = (() => {
    try {
      return JSON.parse(localStorage.getItem("yuvro-eval-candidate") ?? "{}").email;
    } catch {
      return "";
    }
  })();
  const title = (() => {
    try {
      return JSON.parse(localStorage.getItem("yuvro-eval-candidate") ?? "{}").title || "Evaluation";
    } catch {
      return "Evaluation";
    }
  })();

  const [firstName, lastName] = (() => {
    try {
      const data = JSON.parse(localStorage.getItem("yuvro-eval-candidate") ?? "{}");
      return [data.firstName || "", data.lastName || ""];
    } catch {
      return ["", ""];
    }
  })();

  useEffect(() => {
    refs.current[0]?.focus();
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = text[i] ?? "";
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length !== 6) {
      setErr("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const verifyRes = await evaluationService.verifyRegistrationOtp(evaluationId, email, otp, firstName, lastName);
      if (verifyRes.access_token) {
        authService.setAuthToken(verifyRes.access_token);

        await evaluationService.registerPublicEvaluation(evaluationId, verifyRes.access_token);

        router.navigate({ to: "/evaluation/proctoring", search: { e: evaluationId } });
      } else {
        setErr("Verification failed: No access token received.");
      }
    } catch (error: any) {
      setErr(error?.message || "Invalid OTP or registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldown > 0) return;
    setErr(null);
    try {
      await evaluationService.sendRegistrationOtp(evaluationId, email, title);
      setCooldown(30);
    } catch (error: any) {
      setErr(error?.message || "Failed to resend OTP.");
    }
  };

  return (
    <EvalShell step={2} totalSteps={4} stepLabel="Verification">
      <div className="mx-auto max-w-lg">
        <EvalStepHeader
          eyebrow="Step 02"
          title={<>Verify it's you.</>}
          body={`We sent a six-digit code to ${email || "your email"}. Enter it below to continue.`}
        />
        <form onSubmit={submit} className="mt-12">
          <div onPaste={onPaste} className="flex items-center justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                className="h-14 w-12 rounded-lg border border-neutral-300 bg-white text-center font-serif text-[24px] text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end text-[12px] text-neutral-500">
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={resendOtp}
              className="text-neutral-500 disabled:text-neutral-300 enabled:hover:text-neutral-900"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
          {err && (
            <div className="mt-6 border-l-2 border-red-500 pl-3 text-[12px] text-red-600">
              {err}
            </div>
          )}
          <PrimaryButton disabled={loading} className="mt-10">
            {loading ? "Verifying..." : "Verify and continue"}
          </PrimaryButton>
        </form>
      </div>
    </EvalShell>
  );
}
