import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/recruiter-signup")({
  head: () => ({
    meta: [
      { title: "Recruiter Sign Up — Yuvro Labs" },
      { name: "description", content: "Create your Yuvro Labs recruiter workspace." },
      { property: "og:title", content: "Recruiter Sign Up — Yuvro Labs" },
      { property: "og:description", content: "Create your Yuvro Labs recruiter workspace." },
    ],
  }),
  component: RecruiterSignUpPage,
});

function RecruiterSignUpPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyDomain, setNewCompanyDomain] = useState("");
  
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await authService.fetchCompanies();
        const results = Array.isArray(data) ? data : (data as any).results || [];
        setCompanies(results);
      } catch (err) {
        console.error("Failed to fetch companies", err);
      }
    };
    loadCompanies();
  }, []);

  const sendOtp = async () => {
    try {
      setLoading(true);
      setError("");
      setOtp(""); // Clear previous OTP
      await authService.sendRegistrationOtp(email.trim(), "Recruiter Registration");
      setOtpSent(true);
      setCooldown(30);
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const enter = async () => {
    if (!firstName || !email || !password || !confirmPassword) {
      setError("Please fill all required fields.");
      return;
    }

    if (!selectedCompanyId) {
      setError("Please select a company or choose 'Other'.");
      return;
    }

    if (selectedCompanyId === "other") {
      if (!newCompanyName || !newCompanyWebsite || !newCompanyDomain) {
        setError("Please provide Name, Website, and Domain for the new company.");
        return;
      }
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    
    if (!otpSent) {
      await sendOtp();
      return;
    }
    
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password: password,
        otp: otp,
      };

      if (selectedCompanyId === "other") {
        payload.new_company_name = newCompanyName.trim();
        payload.new_company_website = newCompanyWebsite.trim();
        payload.new_company_domain = newCompanyDomain.trim();
      } else {
        payload.company_id = selectedCompanyId;
      }
      
      const response = await authService.registerRecruiter(payload);
      
      login(response.user, response.access);
      nav({ to: "/recruiter" });
    } catch (err: any) {
      let errorMsg = "Registration failed. Please try again.";
      // Extract detail or specific field errors
      if (err?.response?.data) {
        const d = err.response.data;
        if (d.otp) errorMsg = typeof d.otp === 'string' ? d.otp : d.otp[0];
        else if (d.email) errorMsg = typeof d.email === 'string' ? d.email : d.email[0];
        else if (d.non_field_errors) errorMsg = d.non_field_errors[0];
      } else if (err?.yhub_error) {
        errorMsg = err.yhub_error;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
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
            Create your<br />
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

        {/* Right — signup card */}
        <section className="flex items-center">
          <div className="w-full rounded-2xl border border-black/10 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">Sign Up</div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                    disabled={loading}
                    className="mt-1.5 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    disabled={loading}
                    className="mt-1.5 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Company</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    required
                    disabled={loading}
                    className="mt-1.5 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-[14px] outline-none transition focus:border-[#0A0A0A] disabled:opacity-50"
                  >
                    <option value="" disabled>Select a company</option>
                    {companies.map((company: any) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                    <option value="other">Other (Add New)</option>
                  </select>
                </div>
              </div>

              {selectedCompanyId === "other" && (
                <div className="grid grid-cols-3 gap-3 rounded-md border border-black/10 bg-black/5 p-3">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">New Company</label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="Acme Corp"
                      required={selectedCompanyId === "other"}
                      disabled={loading}
                      className="mt-1 w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Website</label>
                    <input
                      type="url"
                      value={newCompanyWebsite}
                      onChange={(e) => setNewCompanyWebsite(e.target.value)}
                      placeholder="https://acme.com"
                      required={selectedCompanyId === "other"}
                      disabled={loading}
                      className="mt-1 w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Domain</label>
                    <input
                      type="text"
                      value={newCompanyDomain}
                      onChange={(e) => setNewCompanyDomain(e.target.value)}
                      placeholder="acme.com"
                      required={selectedCompanyId === "other"}
                      disabled={loading}
                      className="mt-1 w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {!otpSent ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
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

                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B6B]">Confirm Password</label>
                      <div className="relative mt-1.5">
                        <input
                          type={show ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          disabled={loading}
                          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 pr-9 text-[14px] outline-none transition placeholder:text-[#9A9A9A] focus:border-[#0A0A0A] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center mt-4">
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    We sent a 6-digit code to <strong>{email}</strong>
                  </p>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                      <InputOTPSlot index={1} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                      <InputOTPSlot index={2} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                      <InputOTPSlot index={4} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                      <InputOTPSlot index={5} className="w-11 h-12 sm:w-12 sm:h-14 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cooldown > 0 || loading}
                      onClick={sendOtp}
                      className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-50"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="mt-6 group inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Register
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="text-center">
                <span className="text-[13px] text-[#6B6B6B]">Already have an account? </span>
                <Link to="/recruiter-login" className="text-[13px] font-medium text-[#0A0A0A] hover:underline">
                  Sign in
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
