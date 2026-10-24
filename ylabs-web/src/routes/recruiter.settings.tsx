import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Check } from "lucide-react";
import { TIMEZONES, EXPIRY_OPTIONS, DURATION_OPTIONS } from "@/lib/recruiter";

export const Route = createFileRoute("/recruiter/settings")({
  head: () => ({
    meta: [{ title: "Settings — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? "Recruiter");
  const [email, setEmail] = useState(user?.email ?? "recruiter@yuvro.com");
  const [org, setOrg] = useState("Yuvro Talent Co.");
  const [notif, setNotif] = useState({ candidate: true, weekly: true, ai: false });
  const [duration, setDuration] = useState("90 min");
  const [expiry, setExpiry] = useState("14");
  const [timezone, setTimezone] = useState(
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Kolkata"
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "github" || params.get("installation_id")) {
        nav({ to: `/recruiter/github${window.location.search}` as any });
        return;
      }

      try {
        const stored = localStorage.getItem("pl-recruiter-settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) setName(parsed.name);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.org) setOrg(parsed.org);
          if (parsed.notif) setNotif(parsed.notif);
          if (parsed.duration) setDuration(parsed.duration);
          if (parsed.expiry) setExpiry(parsed.expiry);
          if (parsed.timezone) setTimezone(parsed.timezone);
        }
      } catch {}
    }
  }, [nav]);

  const save = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "pl-recruiter-settings",
        JSON.stringify({ name, email, org, notif, duration, expiry, timezone })
      );
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-10">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Manage your recruiter profile and preferences.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title="Profile" desc="How teammates see you.">
          <FieldRow label="Full name">
            <Input value={name} onChange={setName} />
          </FieldRow>
          <FieldRow label="Work email">
            <Input value={email} onChange={setEmail} />
          </FieldRow>
          <FieldRow label="Organization">
            <Input value={org} onChange={setOrg} />
          </FieldRow>
        </Card>

        <Card title="Notifications" desc="What we send to your inbox.">
          <Toggle
            label="Candidate completes evaluation"
            checked={notif.candidate}
            onChange={(v) => setNotif({ ...notif, candidate: v })}
          />
          <Toggle
            label="Weekly evaluation report"
            checked={notif.weekly}
            onChange={(v) => setNotif({ ...notif, weekly: v })}
          />
          <Toggle
            label="Vitarka AI insights digest"
            checked={notif.ai}
            onChange={(v) => setNotif({ ...notif, ai: v })}
          />
        </Card>

        <Card title="Workspace" desc="Recruiter workspace prefs.">
          <FieldRow label="Default duration">
            <Select value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
          </FieldRow>
          <FieldRow label="Default expiry">
            <Select value={expiry} onChange={setExpiry} options={EXPIRY_OPTIONS} />
          </FieldRow>
          <FieldRow label="Time zone">
            <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
          </FieldRow>
        </Card>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110 shadow-sm"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </button>
        <button className="rounded-lg border border-neutral-200 dark:border-white/10 px-5 py-2.5 text-[13px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="text-[13px] font-medium text-white">{title}</div>
      <div className="mt-0.5 text-[11px] text-neutral-500">{desc}</div>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-emerald-400/60"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white outline-none transition focus:border-emerald-400/60"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#121214] text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 text-left"
    >
      <span className="text-[12px] text-neutral-200">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-emerald-400" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-4" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
