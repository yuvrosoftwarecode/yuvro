import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { Github, Save, KeyRound, Check, Link as LinkIcon, Unlink, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: Profile });

const GITHUB_KEY = "yuvro-github-connected";

function Profile() {
  const { user, updateUser } = useAuth();

  /* ── Account detail fields ─────────────────────────────── */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── Password fields ───────────────────────────────────── */
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /* ── GitHub integration ────────────────────────────────── */
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");

  /* ── Initialise form from auth user ────────────────────── */
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setUsername(user.username ?? "");
      setEmail(user.email ?? "");
    }
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(GITHUB_KEY);
      if (raw) {
        try {
          const g = JSON.parse(raw);
          setGithubConnected(!!g.connected);
          setGithubHandle(g.handle ?? "");
        } catch { /* ignore */ }
      }
    }
  }, [user]);

  /* ── Display name derivation ───────────────────────────── */
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || username || me.name;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  /* ── Save profile (calls backend) ──────────────────────── */
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSavedFlash(false);
    setSaving(true);
    try {
      const updated = await authService.updateUser({
        first_name: firstName,
        last_name: lastName,
        username,
      });
      updateUser(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err: any) {
      const msg =
        err?.data?.detail ??
        err?.data?.username?.[0] ??
        err?.message ??
        "Failed to save. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password (via YHub backend) ────────────────── */
  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!currentPwd) {
      setPwdMsg({ ok: false, text: "Enter your current password." });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: "New passwords don't match." });
      return;
    }

    setPwdSaving(true);
    try {
      await authService.changePassword(currentPwd, newPwd);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setPwdMsg({ ok: true, text: "Password updated successfully." });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      const msg =
        err?.data?.detail ??
        err?.data?.current_password?.[0] ??
        err?.data?.new_password?.[0] ??
        err?.message ??
        "Failed to update password.";
      setPwdMsg({ ok: false, text: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── GitHub connect / disconnect ───────────────────────── */
  const connectGithub = () => {
    const h = window.prompt("Enter your GitHub username to connect", githubHandle || "");
    if (!h) return;
    setGithubConnected(true);
    setGithubHandle(h);
    try { localStorage.setItem(GITHUB_KEY, JSON.stringify({ connected: true, handle: h })); } catch { /* ignore */ }
  };
  const disconnectGithub = () => {
    if (!confirm("Disconnect your GitHub account?")) return;
    setGithubConnected(false);
    setGithubHandle("");
    try { localStorage.removeItem(GITHUB_KEY); } catch { /* ignore */ }
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[900px] px-4 py-8 space-y-6">

        {/* ── Hero banner ─────────────────────────────────── */}
        <div className="rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-background p-6 flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground text-2xl font-semibold">{initial}</div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{displayName}</h1>
            <div className="text-sm text-muted-foreground truncate">
              {email || username} · Level {me.level}
            </div>
          </div>
        </div>

        {/* ── Account details ─────────────────────────────── */}
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Account details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Update your public profile information.</p>
            </div>
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-3.5 w-3.5" /> Saved</span>
            )}
          </div>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="input" />
            </Field>
            <Field label="Last name">
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="input" />
            </Field>
            <Field label="Username">
              <input value={username} onChange={e => setUsername(e.target.value)} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} readOnly disabled className="input input-disabled" title="Email cannot be changed" />
            </Field>
            {saveError && (
              <div className="sm:col-span-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {saveError}
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Update password (via YHub backend) ──────────── */}
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Update password</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Use a strong password you don't reuse elsewhere. Managed securely by YHub.</p>
          </div>
          <form onSubmit={updatePassword} className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password" className="sm:col-span-2">
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="input" autoComplete="current-password" />
            </Field>
            <Field label="New password">
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="input" autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="input" autoComplete="new-password" />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              {pwdMsg ? (
                <span className={`inline-flex items-center gap-1.5 text-xs ${pwdMsg.ok ? "text-success" : "text-destructive"}`}>
                  {pwdMsg.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {pwdMsg.text}
                </span>
              ) : <span />}
              <button type="submit" disabled={pwdSaving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {pwdSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                {pwdSaving ? "Updating…" : "Update password"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Connected accounts ──────────────────────────── */}
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Connected accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Link external services to power lab integrations.</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-accent">
                <Github className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">GitHub</div>
                <div className="text-xs text-muted-foreground truncate">
                  {githubConnected ? `Connected as @${githubHandle}` : "Not connected"}
                </div>
              </div>
            </div>
            {githubConnected ? (
              <button onClick={disconnectGithub}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </button>
            ) : (
              <button onClick={connectGithub}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
                <LinkIcon className="h-3.5 w-3.5" /> Connect
              </button>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .input{width:100%;background:transparent;border:1px solid hsl(var(--border));border-radius:.5rem;padding:.5rem .625rem;font-size:.8125rem;outline:none;transition:border-color .15s}
        .input:focus{border-color:hsl(var(--primary))}
        .input-disabled{opacity:.55;cursor:not-allowed;background:hsl(var(--accent)/.35)}
      `}</style>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
