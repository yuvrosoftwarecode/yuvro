import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EvalShell, EvalStepHeader, PrimaryButton, Field } from "@/components/evaluation/EvalShell";
import { evaluationService, setTempResumeFile } from "../services/evaluationService";
import YuvroLogo from "@/assets/YuvroLogo.png";

export const Route = createFileRoute("/evaluation/")({
  head: () => ({
    meta: [
      { title: "Engineering Evaluation — Yuvro Labs" },
      { name: "description", content: "Begin your Yuvro Labs engineering evaluation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvaluationInvite,
});

const COUNTRIES = [
  { code: "+91", label: "🇮🇳 India (+91)", digits: 10 },
  { code: "+1", label: "🇺🇸 US/CA (+1)", digits: 10 },
  { code: "+44", label: "🇬🇧 UK (+44)", digits: 10 },
  { code: "+61", label: "🇦🇺 Australia (+61)", digits: 9 },
  { code: "+65", label: "🇸🇬 Singapore (+65)", digits: 8 },
  { code: "+971", label: "🇦🇪 UAE (+971)", digits: 9 },
];

function EvaluationInvite() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const evaluationId = searchParams?.e || searchParams?.evaluationId || "";
  const [estMinutes, setEstMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!evaluationId) return;
    evaluationService.getWorkspaceData(evaluationId).then((data) => {
      if (data?.sections) {
        let total = 0;
        data.sections.forEach((sec: any) => {
          if (sec.type === "LAB") {
            (sec.questions || []).forEach((q: any) => {
              total += Number(q.duration_minutes || 30);
            });
          } else if (sec.type === "KNOWLEDGE_ASSESSMENT") {
            (sec.questions || []).forEach((q: any) => {
              total += Number(q.duration_minutes || 2);
            });
          } else if (sec.type === "VITARKA_AI_INTERVIEW") {
            let meta: any = {};
            try { meta = typeof sec.description === "string" ? JSON.parse(sec.description) : {}; } catch {}
            total += Number(meta.duration || meta.duration_minutes || sec.duration_minutes || sec.duration || 15);
          } else if (sec.type === "SYSTEM_DESIGN") {
            const firstQ = (sec.questions || [])[0];
            total += Number(firstQ?.duration_minutes || sec.duration_minutes || 45);
          }
        });
        if (total > 0) setEstMinutes(total);
      }
    }).catch(() => {});
  }, [evaluationId]);

  const onFiles = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!firstName.trim()) missing.push("firstName");
    if (!lastName.trim()) missing.push("lastName");
    if (!email.trim()) missing.push("email");
    if (!phone.trim()) missing.push("phone");

    if (missing.length > 0 || !evaluationId) {
      setMissingFields(missing);
      if (!evaluationId) {
        setErr("A valid evaluation link is required.");
      } else {
        setErr(null);
      }
      return;
    }
    
    if (phone.length < 5) {
      setErr("Please enter a valid mobile number.");
      setMissingFields(["phone"]);
      return;
    }
    
    setLoading(true);
    setErr(null);
    setMissingFields([]);
    try {
      const checkRes = await evaluationService.checkRegistration(evaluationId, email);
      if (checkRes.is_expired) {
        setErr(checkRes.error || "This evaluation has expired and is no longer accepting submissions.");
        setLoading(false);
        return;
      }
      if (checkRes.registered) {
        setErr("The user is already evaluated with this mail");
        setLoading(false);
        return;
      }
      const title = checkRes.title || "Evaluation";
      await evaluationService.sendRegistrationOtp(evaluationId, email, title);
      localStorage.setItem(
        "yuvro-eval-candidate",
        JSON.stringify({ evaluationId, firstName, lastName, email, phone: `${countryCode} ${phone}`, resume: file?.name, title }),
      );
      if (file) {
        setTempResumeFile(file);
      }
      router.navigate({ to: "/evaluation/otp", search: { e: evaluationId } });
    } catch (error: any) {
      setErr(error?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <EvalShell step={1} totalSteps={4} stepLabel="Verification">
      <div className="grid gap-16 lg:grid-cols-[1.05fr_1fr]">
        <section className="max-w-xl">
          {/* <EvalStepHeader
            eyebrow="Invitation verified"
            title={
              <>
                A quieter place
                <br />
                to be evaluated
                <br />
                <span className="text-neutral-400">as an engineer.</span>
              </>
            }
            body="Yuvro Labs is a workspace — labs, a terminal, a database, and a short engineering discussion. Bring the way you actually work."
          /> */}
          <div className="flex items-center gap-4">
            <img src={YuvroLogo} alt="Yuvro Logo" className="h-24 w-auto object-contain" />
            <span className="text-5xl tracking-tight text-neutral-900">Yuvro Labs</span>
          </div>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-neutral-600">
            Yuvro Labs is a workspace — labs, a terminal, a database, and a short engineering discussion. Bring the way you actually work.
          </p>
          <ol className="mt-12 space-y-5 text-[13px] text-neutral-600">
            {[
              ["01", "Verification", "Confirm your email with a one-time code."],
              ["02", "Proctoring", "A quick look at your camera, microphone, and screen."],
              ["03", "Evaluation", "Engineering labs, knowledge assessment."],
              ["04", "Engineering discussion", "A short conversation about the work you just did."],
            ].map(([n, t, d]) => (
              <li
                key={n}
                className="grid grid-cols-[44px_1fr] items-baseline gap-4 border-t border-neutral-200 pt-5 first:border-t-0 first:pt-0"
              >
                <span className="font-mono text-[11px] tracking-widest text-neutral-400">{n}</span>
                <span>
                  <span className="text-neutral-900">{t}.</span>{" "}
                  <span className="text-neutral-500">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lg:pl-6">
          <form
            noValidate
            onSubmit={submit}
            className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_60px_-30px_rgba(0,0,0,0.15)] sm:p-10"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              Begin
            </div>

            {err && (
              <div className="mt-4 border-l-2 border-red-500 pl-3 text-[12px] text-red-600">
                {err}
              </div>
            )}

            <div className="mt-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" hint={missingFields.includes("firstName") ? <span className="text-red-500">Required</span> : "Required"}>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setMissingFields((prev) => prev.filter((f) => f !== "firstName"));
                    }}
                    placeholder="First name"
                    className={`eval-input ${missingFields.includes("firstName") ? "!border-red-500" : ""}`}
                  />
                </Field>
                <Field label="Last name" hint={missingFields.includes("lastName") ? <span className="text-red-500">Required</span> : "Required"}>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setMissingFields((prev) => prev.filter((f) => f !== "lastName"));
                    }}
                    placeholder="Last name"
                    className={`eval-input ${missingFields.includes("lastName") ? "!border-red-500" : ""}`}
                  />
                </Field>
              </div>
              <Field label="Email address" hint={missingFields.includes("email") ? <span className="text-red-500">Required</span> : "We'll send a one-time verification code."}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setMissingFields((prev) => prev.filter((f) => f !== "email"));
                  }}
                  placeholder="Email address"
                  className={`eval-input ${missingFields.includes("email") ? "!border-red-500" : ""}`}
                />
              </Field>
              <Field label="Phone number" hint={missingFields.includes("phone") ? <span className="text-red-500">Required</span> : "Required"}>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="eval-input !w-[160px] shrink-0"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    pattern="[0-9]*"
                    title="Please enter a valid mobile number"
                    maxLength={COUNTRIES.find(c => c.code === countryCode)?.digits || 15}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, COUNTRIES.find(c => c.code === countryCode)?.digits || 15));
                      setMissingFields((prev) => prev.filter((f) => f !== "phone"));
                    }}
                    placeholder="Phone number"
                    className={`eval-input flex-1 ${missingFields.includes("phone") ? "!border-red-500" : ""}`}
                  />
                </div>
              </Field>
              <Field label="Resume" hint="Optional">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    onFiles(e.dataTransfer.files);
                  }}
                  className={`mt-1 flex cursor-pointer items-center justify-between rounded-lg border border-dashed px-4 py-4 text-[13px] transition ${
                    dragOver
                      ? "border-neutral-900 bg-neutral-50"
                      : file
                        ? "border-neutral-300 bg-neutral-50/60"
                        : "border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50/60"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <DocIcon />
                    <span className="min-w-0">
                      {file ? (
                        <>
                          <span className="block truncate text-neutral-900">{file.name}</span>
                          <span className="mt-0.5 block text-[11px] text-neutral-500">
                            {(file.size / 1024).toFixed(0)} KB · click to replace
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-neutral-900">
                            Drop your resume or{" "}
                            <span className="underline underline-offset-4 decoration-neutral-300">
                              browse
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11px] text-neutral-500">
                            A short technical résumé works best.
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                  <input
                    ref={inputRef}
                    type="file"
                    className="sr-only"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              </Field>
            </div>

            <PrimaryButton disabled={loading} className="mt-10 w-full">
              {loading ? "Sending..." : "Send verification code to email"}
            </PrimaryButton>

            <p className="mt-6 text-[11px] leading-relaxed text-neutral-500">
              By continuing, you agree to a brief system and proctoring check. We only collect
              what's needed to conduct the evaluation.
            </p>
          </form>

          <div className="mt-6 text-center text-[11px] text-neutral-500">
            {/* <span>Est. {estMinutes ? `${estMinutes} minutes` : "30–60 minutes"} · works best on Chrome, Safari or Edge</span> */}
          </div>
        </section>
      </div>
    </EvalShell>
  );
}

function DocIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0 text-neutral-500"
    >
      <path
        d="M5 2.5h6l4 4V16a1.5 1.5 0 0 1-1.5 1.5h-8.5A1.5 1.5 0 0 1 3.5 16V4A1.5 1.5 0 0 1 5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M11 2.5V6a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
