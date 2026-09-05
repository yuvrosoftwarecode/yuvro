import { useEffect, useState } from "react";
import {
  Save,
  Bell,
  Clock,
  ShieldCheck,
  Mail,
  Palette,
  Download,
  Users,
  Check,
} from "lucide-react";
import { saveEvaluation, type Evaluation } from "@/lib/recruiter";

const KEY = (id: string) => `yuvro-eval-settings-${id}`;

interface Settings {
  windowStart: string;
  windowEnd: string;
  timezone: string;
  proctoring: boolean;
  fullscreenLock: boolean;
  copyPasteBlock: boolean;
  cameraRequired: boolean;
  retake: "none" | "one" | "unlimited";
  candidateSeeScore: boolean;
  candidateSeeReport: boolean;
  candidateSeeCorrect: boolean;
  downloadsCsv: boolean;
  downloadsPdf: boolean;
  emailInviteSubject: string;
  emailInviteBody: string;
  emailReminderSubject: string;
  emailReminderBody: string;
  reminderDays: number[];
  expiryDays: number;
  brandingColor: string;
  brandingLogo: string;
  notifyOnSubmit: boolean;
  notifyOnComplete: boolean;
  notifyOnInterview: boolean;
  notifyOnExpiry: boolean;
}

const DEFAULTS: Settings = {
  windowStart: "",
  windowEnd: "",
  timezone: "Asia/Kolkata",
  proctoring: true,
  fullscreenLock: true,
  copyPasteBlock: true,
  cameraRequired: false,
  retake: "one",
  candidateSeeScore: true,
  candidateSeeReport: false,
  candidateSeeCorrect: false,
  downloadsCsv: true,
  downloadsPdf: true,
  emailInviteSubject: "You've been invited to {{evaluation}}",
  emailInviteBody:
    "Hi {{name}},\n\nYou've been invited to complete the {{evaluation}} evaluation for {{company}}.\n\nStart here: {{link}}\n\nGood luck,\nThe hiring team",
  emailReminderSubject: "Reminder: {{evaluation}} closes in {{days}} days",
  emailReminderBody:
    "Hi {{name}},\n\nJust a friendly reminder — {{evaluation}} closes in {{days}} days.\n\nStart here: {{link}}",
  reminderDays: [3, 1],
  expiryDays: 14,
  brandingColor: "#f97316",
  brandingLogo: "",
  notifyOnSubmit: true,
  notifyOnComplete: true,
  notifyOnInterview: true,
  notifyOnExpiry: true,
};

export function SettingsTab({ ev, notify, onSave }: { ev: Evaluation; notify: (m: string) => void; onSave?: (e: Evaluation) => void }) {
  const [s, setS] = useState<Settings>(() => ({ ...DEFAULTS, ...(ev.settings || {}) }));
  const [dirty, setDirty] = useState(false);
  const [title, setTitle] = useState(ev.title);
  const [status, setStatus] = useState(ev.status);

  useEffect(() => {
    setS({ ...DEFAULTS, ...(ev.settings || {}) });
    setTitle(ev.title);
    setStatus(ev.status);
  }, [ev.id, ev.title, ev.status, ev.settings]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    const updated = { ...ev, title: title || ev.title, status, settings: s as any };
    await saveEvaluation(updated);
    if (onSave) onSave(updated);
    setDirty(false);
    notify("Settings saved");
  };

  const reset = () => {
    setS(DEFAULTS);
    setDirty(true);
    notify("Reset to defaults");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="text-[11px] uppercase tracking-widest text-neutral-500">Settings</div>
        <nav className="mt-3 flex flex-col gap-0.5 text-[12px]">
          {[
            ["general", "General"],
            ["window", "Evaluation window"],
            ["proctor", "Proctoring"],
            ["candidate", "Candidate permissions"],
            ["downloads", "Downloads"],
            ["email", "Email templates"],
            ["reminders", "Reminders & expiry"],
            ["branding", "Branding"],
            ["notify", "Notifications"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#s-${id}`}
              className="rounded-md px-2 py-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-8">
        <Group id="general" title="General" icon={<Users className="h-3.5 w-3.5" />}>
          <Field label="Evaluation title">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-white outline-none focus:border-white/25"
            />
          </Field>
          <Field label="Status">
            <div className="flex gap-2">
              {(["draft", "published"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setStatus(v);
                    setDirty(true);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-[12px] ${status === v ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-300 hover:bg-white/5"}`}
                >
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </Field>
        </Group>

        <Group id="window" title="Evaluation window" icon={<Clock className="h-3.5 w-3.5" />}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Start">
              <input
                type="datetime-local"
                value={s.windowStart}
                onChange={(e) => update("windowStart", e.target.value)}
                className={inp}
              />
            </Field>
            <Field label="End">
              <input
                type="datetime-local"
                value={s.windowEnd}
                onChange={(e) => update("windowEnd", e.target.value)}
                className={inp}
              />
            </Field>
          </div>
          <Field label="Timezone">
            <select
              value={s.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className={inp}
            >
              {[
                "Asia/Kolkata",
                "America/Los_Angeles",
                "America/New_York",
                "Europe/London",
                "Asia/Singapore",
                "UTC",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </Group>

        <Group id="proctor" title="Proctoring" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <Toggle
            label="Enable proctoring"
            desc="Detect tab switches, background noise and multiple faces."
            value={s.proctoring}
            onChange={(v) => update("proctoring", v)}
          />
          <Toggle
            label="Fullscreen lock"
            desc="Force fullscreen during the entire evaluation."
            value={s.fullscreenLock}
            onChange={(v) => update("fullscreenLock", v)}
          />
          <Toggle
            label="Block copy / paste"
            desc="Prevent copying question text or pasting answers."
            value={s.copyPasteBlock}
            onChange={(v) => update("copyPasteBlock", v)}
          />
          <Toggle
            label="Require camera"
            desc="Candidate must grant camera access before starting."
            value={s.cameraRequired}
            onChange={(v) => update("cameraRequired", v)}
          />
          <Field label="Retake policy">
            <select
              value={s.retake}
              onChange={(e) => update("retake", e.target.value as any)}
              className={inp}
            >
              <option value="none">Not allowed</option>
              <option value="one">One retake</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </Field>
        </Group>

        <Group
          id="candidate"
          title="Candidate permissions"
          icon={<Users className="h-3.5 w-3.5" />}
        >
          <Toggle
            label="Show score to candidate"
            desc="Reveal ECI after submission."
            value={s.candidateSeeScore}
            onChange={(v) => update("candidateSeeScore", v)}
          />
          <Toggle
            label="Share candidate report"
            desc="Downloadable PDF of their performance."
            value={s.candidateSeeReport}
            onChange={(v) => update("candidateSeeReport", v)}
          />
          <Toggle
            label="Reveal correct answers"
            desc="Show correct MCQ answers after submission."
            value={s.candidateSeeCorrect}
            onChange={(v) => update("candidateSeeCorrect", v)}
          />
        </Group>

        <Group id="downloads" title="Downloads" icon={<Download className="h-3.5 w-3.5" />}>
          <Toggle
            label="Allow CSV exports"
            value={s.downloadsCsv}
            onChange={(v) => update("downloadsCsv", v)}
          />
          <Toggle
            label="Allow PDF exports"
            value={s.downloadsPdf}
            onChange={(v) => update("downloadsPdf", v)}
          />
        </Group>

        <Group id="email" title="Email templates" icon={<Mail className="h-3.5 w-3.5" />}>
          <div className="text-[11px] text-neutral-500">
            Placeholders:{" "}
            <code className="text-neutral-300">{`{{name}} {{evaluation}} {{company}} {{link}} {{days}}`}</code>
          </div>
          <Field label="Invitation subject">
            <input
              value={s.emailInviteSubject}
              onChange={(e) => update("emailInviteSubject", e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="Invitation body">
            <textarea
              rows={5}
              value={s.emailInviteBody}
              onChange={(e) => update("emailInviteBody", e.target.value)}
              className={`${inp} font-mono text-[12px]`}
            />
          </Field>
          <Field label="Reminder subject">
            <input
              value={s.emailReminderSubject}
              onChange={(e) => update("emailReminderSubject", e.target.value)}
              className={inp}
            />
          </Field>
          <Field label="Reminder body">
            <textarea
              rows={4}
              value={s.emailReminderBody}
              onChange={(e) => update("emailReminderBody", e.target.value)}
              className={`${inp} font-mono text-[12px]`}
            />
          </Field>
          <button
            onClick={() => notify("Preview email sent to you")}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-neutral-200 hover:bg-white/5"
          >
            Send preview email
          </button>
        </Group>

        <Group id="reminders" title="Reminders & expiry" icon={<Clock className="h-3.5 w-3.5" />}>
          <Field label="Reminder days before expiry">
            <div className="flex flex-wrap gap-2">
              {[7, 5, 3, 2, 1].map((d) => {
                const on = s.reminderDays.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() =>
                      update(
                        "reminderDays",
                        on
                          ? s.reminderDays.filter((x) => x !== d)
                          : [...s.reminderDays, d].sort((a, b) => b - a),
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${on ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-neutral-400 hover:bg-white/5"}`}
                  >
                    T-{d}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Invitation expiry (days)">
            <input
              type="number"
              min={1}
              max={90}
              value={s.expiryDays}
              onChange={(e) => update("expiryDays", parseInt(e.target.value) || 14)}
              className={`${inp} w-24`}
            />
          </Field>
        </Group>

        <Group id="branding" title="Branding" icon={<Palette className="h-3.5 w-3.5" />}>
          <Field label="Accent color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={s.brandingColor}
                onChange={(e) => update("brandingColor", e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border border-white/10 bg-black/20"
              />
              <input
                value={s.brandingColor}
                onChange={(e) => update("brandingColor", e.target.value)}
                className={`${inp} w-40 font-mono text-[12px]`}
              />
            </div>
          </Field>
          <Field label="Logo URL">
            <input
              value={s.brandingLogo}
              placeholder="https://…"
              onChange={(e) => update("brandingLogo", e.target.value)}
              className={inp}
            />
          </Field>
        </Group>

        <Group id="notify" title="Notifications" icon={<Bell className="h-3.5 w-3.5" />}>
          <Toggle
            label="On candidate submission"
            value={s.notifyOnSubmit}
            onChange={(v) => update("notifyOnSubmit", v)}
          />
          <Toggle
            label="On evaluation completion"
            value={s.notifyOnComplete}
            onChange={(v) => update("notifyOnComplete", v)}
          />
          <Toggle
            label="On interview scheduled"
            value={s.notifyOnInterview}
            onChange={(v) => update("notifyOnInterview", v)}
          />
          <Toggle
            label="On invitation expiry"
            value={s.notifyOnExpiry}
            onChange={(v) => update("notifyOnExpiry", v)}
          />
        </Group>

        {/* Sticky save bar */}
        <div
          className={`sticky bottom-4 z-30 flex items-center justify-between rounded-xl border border-neutral-200 bg-white/95 px-4 py-3 shadow-md backdrop-blur transition ${dirty ? "opacity-100" : "opacity-60"}`}
        >
          <div className="text-[12px] text-neutral-500">
            {dirty ? (
              <span className="text-amber-600">You have unsaved changes</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-600">
                <Check className="h-3.5 w-3.5" /> All changes saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Reset to defaults
            </button>
            <button
              onClick={save}
              disabled={!dirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-[12px] font-medium text-black transition hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-white outline-none focus:border-white/25";

function Group({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`s-${id}`}
      className="scroll-mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5"
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-white">
        {icon}
        {title}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13px] text-white">{label}</div>
        {desc && <div className="text-[11px] text-neutral-500">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${value ? "bg-emerald-400" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
