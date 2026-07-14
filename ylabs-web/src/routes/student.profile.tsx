import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { TopNav } from "@/components/TopNav";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import authService from "@/services/authService";
import { Github, Save, KeyRound, Check, Link as LinkIcon, Unlink, Loader2, AlertCircle, Camera, UploadCloud, Trash2, Edit2 } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";



export const Route = createFileRoute("/student/profile")({ 
  
  component: Profile 
});


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
  const githubConnected = user?.github_connected ?? false;
  const githubHandle = user?.github_username ?? "";
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectInput, setDisconnectInput] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  /* ── Image upload states ───────────────────────────────── */
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [coverDropdownOpen, setCoverDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileRef, () => setProfileDropdownOpen(false));
  useClickOutside(coverRef, () => setCoverDropdownOpen(false));

  /* ── Hydration guard: images depend on localStorage user,
       which doesn't exist during SSR. Defer to avoid mismatch. ── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const coverImage  = mounted ? user?.cover_image  : undefined;
  const profileImage = mounted ? user?.profile_image : undefined;

  /* ── Initialise form from auth user ────────────────────── */
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setUsername(user.username ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  /* ── Display name derivation ───────────────────────────── */
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || username;
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
  const connectGithub = async () => {
    try {
      const { yhubApiAuthUtil } = await import('@/utils/RestApiAuthUtil');
      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>('/auth/github/connect/');
      if (data.authorization_url) window.location.href = data.authorization_url;
    } catch (e) {
      console.error("Failed to fetch github connect url", e);
    }
  };
  const initiateDisconnect = () => {
    setDisconnectInput("");
    setShowDisconnectModal(true);
  };
  const confirmDisconnect = async () => {
    if (disconnectInput !== githubHandle) return;
    setDisconnecting(true);
    try {
      const { yhubApiAuthUtil } = await import('@/utils/RestApiAuthUtil');
      await yhubApiAuthUtil.delete('/auth/github/connect/');
      const updatedUser = await authService.getCurrentUser();
      updateUser(updatedUser);
      setShowDisconnectModal(false);
    } catch (e) {
      console.error("Failed to disconnect github", e);
      alert("Failed to disconnect GitHub account.");
    } finally {
      setDisconnecting(false);
    }
  };

  /* ── Image upload handlers ─────────────────────────────── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'profile_image' | 'cover_image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = field === 'profile_image' ? setIsUploadingProfile : setIsUploadingCover;
    setUploading(true);

    try {
      const updatedUser = await authService.uploadProfileImage(file, field);
      updateUser(updatedUser);
      if (field === 'profile_image') setProfileDropdownOpen(false);
      else setCoverDropdownOpen(false);
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
      alert(`Failed to upload image. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (field: 'profile_image' | 'cover_image') => {
    if (!confirm(`Are you sure you want to remove your ${field.replace('_', ' ')}?`)) return;
    
    const setUploading = field === 'profile_image' ? setIsUploadingProfile : setIsUploadingCover;
    setUploading(true);

    try {
      const updatedUser = await authService.removeProfileImage(field);
      updateUser(updatedUser);
      if (field === 'profile_image') setProfileDropdownOpen(false);
      else setCoverDropdownOpen(false);
    } catch (err) {
      console.error(`Failed to remove ${field}:`, err);
      alert(`Failed to remove image. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[900px] px-4 py-8 space-y-6">

        {/* ── Hero banner ─────────────────────────────────── */}
        <div 
          className="relative rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-background p-6 flex items-end gap-5 overflow-visible group min-h-[200px]"
          style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {/* Cover image overlay for text readability if cover exists */}
          {coverImage && <div className="absolute inset-0 bg-black/40 rounded-2xl pointer-events-none" />}
          
          <div className="absolute top-4 right-4 z-20" onMouseLeave={() => setCoverDropdownOpen(false)}>
            {!coverImage ? (
              <label className="cursor-pointer bg-background/80 hover:bg-background/90 text-foreground px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors">
                {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {isUploadingCover ? "Uploading..." : "Upload Cover"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'cover_image')} disabled={isUploadingCover} />
              </label>
            ) : (
              <div className="relative" ref={coverRef}>
                <button 
                  onClick={() => setCoverDropdownOpen(!coverDropdownOpen)}
                  className="bg-background/80 hover:bg-background/90 text-foreground px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-sm shadow-sm transition-colors"
                >
                  {isUploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
                  {isUploadingCover ? "Updating..." : "Edit Cover"}
                </button>
                {coverDropdownOpen && (
                  <div className="absolute right-0 top-full pt-1 z-30">
                    <div className="w-36 bg-popover border rounded-md shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                      <label className="cursor-pointer px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5" /> Change
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'cover_image')} />
                      </label>
                      <button onClick={() => handleRemoveImage('cover_image')} className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 text-left flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative z-20">
            <div className="relative group/avatar">
              <div className="relative block rounded-full border-4 border-background overflow-hidden bg-primary text-primary-foreground h-20 w-20 shadow-md">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl font-semibold">
                    {initial}
                  </div>
                )}
                {isUploadingProfile && (
                  <div className="absolute inset-0 bg-black/50 grid place-items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              {/* Profile Image Action Button */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-max">
                {!profileImage ? (
                  <label className="cursor-pointer bg-background hover:bg-accent text-foreground px-2.5 py-1 rounded-full text-[10px] font-medium inline-flex items-center gap-1 shadow-md border transition-colors opacity-0 group-hover/avatar:opacity-100">
                    <UploadCloud className="w-3 h-3" /> Upload Profile
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'profile_image')} disabled={isUploadingProfile} />
                  </label>
                ) : (
                  <div className="relative" ref={profileRef}>
                    <button 
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="bg-background hover:bg-accent text-foreground px-2.5 py-1 rounded-full text-[10px] font-medium inline-flex items-center gap-1 shadow-md border transition-colors opacity-0 group-hover/avatar:opacity-100 focus:opacity-100"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Profile
                    </button>
                    {profileDropdownOpen && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1 z-30">
                        <div className="w-32 bg-popover border rounded-md shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                          <label className="cursor-pointer px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
                            <Camera className="w-3.5 h-3.5" /> Change
                            <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleImageUpload(e, 'profile_image')} />
                          </label>
                          <button onClick={() => handleRemoveImage('profile_image')} className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 text-left flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="min-w-0 relative z-10 pb-2 ml-2">
            <h1 className={`text-2xl font-semibold truncate ${coverImage ? 'text-white' : ''}`}>{displayName}</h1>
            <div className={`text-sm truncate ${coverImage ? 'text-white/80' : 'text-muted-foreground'}`}>
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
              <button onClick={initiateDisconnect}
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

      {/* ── Disconnect Modal ───────────────────────────────── */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Disconnect GitHub</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Type <strong className="text-foreground">{githubHandle}</strong> to confirm you want to disconnect this account.
            </p>
            <input
              type="text"
              value={disconnectInput}
              onChange={(e) => setDisconnectInput(e.target.value)}
              className="input mb-4"
              placeholder={githubHandle}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors"
                disabled={disconnecting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                disabled={disconnectInput !== githubHandle || disconnecting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}

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
