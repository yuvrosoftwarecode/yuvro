import { useState } from 'react'
import { inputCls } from '@/lib/recruiterSettings'
import { TIMEZONES, EXPIRY_OPTIONS, DURATION_OPTIONS } from '@/lib/recruiter'

const Field = ({
  label,
  children,
  error,
  hint,
}: {
  label: string
  children: React.ReactNode
  error?: string
  hint?: string
}) => (
  <div className="mb-5">
    <label className="mb-1.5 block text-sm font-medium leading-5 text-foreground">{label}</label>
    <div className="max-w-[360px]">{children}</div>
    {error ? (
      <p className="mt-1.5 text-sm text-destructive">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
    ) : null}
  </div>
)

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-[14px] font-medium text-foreground">{label}</div>
      {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

export interface AccountData {
  company: string
  name: string
  email: string
  notif?: { candidate: boolean; weekly: boolean; ai: boolean }
  duration?: string
  expiry?: string
  timezone?: string
}

export function AccountPage({
  account,
  isOwner,
  onSave,
  onChangePassword,
}: {
  account: AccountData
  isOwner: boolean
  onSave: (v: {
    company: string
    name: string
    notif: { candidate: boolean; weekly: boolean; ai: boolean }
    duration: string
    expiry: string
    timezone: string
  }) => Promise<void>
  onChangePassword: (current: string, next: string) => Promise<void>
}) {
  const [company, setCompany] = useState(account.company)
  const [name, setName] = useState(account.name)
  const [duration, setDuration] = useState(account.duration ?? '90 min')
  const [expiry, setExpiry] = useState(account.expiry ?? '14')
  const [timezone, setTimezone] = useState(
    account.timezone ??
      (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata')
  )
  const [notif, setNotif] = useState(
    account.notif ?? { candidate: true, weekly: true, ai: false }
  )

  const dirty =
    company !== account.company ||
    name !== account.name ||
    duration !== (account.duration ?? '90 min') ||
    expiry !== (account.expiry ?? '14') ||
    timezone !==
      (account.timezone ??
        (typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'Asia/Kolkata')) ||
    notif.candidate !== (account.notif?.candidate ?? true) ||
    notif.weekly !== (account.notif?.weekly ?? true) ||
    notif.ai !== (account.notif?.ai ?? false)

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [conf, setConf] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [curErr, setCurErr] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [updatingPw, setUpdatingPw] = useState(false)
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }))

  const nextErr =
    next.length < 8
      ? 'Use at least 8 characters'
      : !/[A-Za-z]/.test(next) || !/\d/.test(next)
        ? 'Include a letter and a number'
        : next === cur
          ? 'Choose a password different from your current one'
          : ''
  const confErr = conf !== next ? 'Passwords do not match' : ''
  const pwValid = !!cur && !nextErr && !confErr

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      await onSave({ company, name, notif, duration, expiry, timezone })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    setUpdatingPw(true)
    setPwSuccess(false)
    try {
      await onChangePassword(cur, next)
      setCur('')
      setNext('')
      setConf('')
      setTouched({})
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 2500)
    } catch (e: any) {
      if (e?.message === 'wrong_password') {
        setCurErr('Current password is incorrect')
      } else {
        setCurErr(e?.message || 'Failed to update password')
      }
    } finally {
      setUpdatingPw(false)
    }
  }

  return (
    <>
      <h2>Account</h2>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">Manage your company details and sign-in</p>

      <Field label="Company name">
        <input
          className={inputCls}
          value={company}
          disabled={!isOwner}
          onChange={(e) => setCompany(e.target.value)}
        />
      </Field>
      <Field label="Your name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Sign-in email" hint="Contact support to change your email">
        <input className={inputCls} value={account.email} disabled />
      </Field>

      <div className="mt-8 border-t border-border pt-7">
        <h3>Workspace preferences</h3>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">
          Recruiter workspace default preferences for evaluations
        </p>
        <Field label="Default duration">
          <select
            className={inputCls}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Default expiry">
          <select
            className={inputCls}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            {EXPIRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time zone">
          <select
            className={inputCls}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-8 border-t border-border pt-7">
        <h3>Notifications</h3>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">What we send to your inbox</p>
        <div className="max-w-[420px] divide-y divide-border">
          <Toggle
            label="Candidate completes evaluation"
            hint="Get notified when a candidate finishes a test"
            checked={notif.candidate}
            onChange={(v) => setNotif({ ...notif, candidate: v })}
          />
          <Toggle
            label="Weekly evaluation report"
            hint="Digest of candidates and scores from the week"
            checked={notif.weekly}
            onChange={(v) => setNotif({ ...notif, weekly: v })}
          />
          <Toggle
            label="Vitarka AI insights digest"
            hint="Summaries and recommendations from Vitarka AI"
            checked={notif.ai}
            onChange={(v) => setNotif({ ...notif, ai: v })}
          />
        </div>
      </div>

      <div className="mt-7 flex items-center gap-3">
        <button
          className="rounded-md bg-primary px-4 py-2.5 text-[15px] font-medium text-primary-foreground hover:bg-[#E5820F] disabled:bg-border disabled:text-muted-foreground transition-colors"
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving changes...' : 'Save changes'}
        </button>
        {saveSuccess && (
          <span className="text-sm font-medium text-emerald-600">Changes saved successfully</span>
        )}
      </div>

      <div className="mt-10 border-t border-border pt-7">
        <h3>Password</h3>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">
          Use at least 8 characters, with a number and a letter
        </p>
        <Field label="Current password" error={curErr}>
          <input
            type="password"
            className={inputCls}
            value={cur}
            onChange={(e) => {
              setCur(e.target.value)
              setCurErr('')
            }}
          />
        </Field>
        <Field label="New password" error={touched.next ? nextErr : ''}>
          <input
            type="password"
            className={inputCls}
            value={next}
            onBlur={() => touch('next')}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password" error={touched.conf ? confErr : ''}>
          <input
            type="password"
            className={inputCls}
            value={conf}
            onBlur={() => touch('conf')}
            onChange={(e) => setConf(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md border border-border bg-background px-4 py-2.5 text-[15px] font-medium hover:bg-accent disabled:text-muted-foreground disabled:hover:bg-background transition-colors"
            disabled={!pwValid || updatingPw}
            onClick={handleUpdatePassword}
          >
            {updatingPw ? 'Updating...' : 'Update password'}
          </button>
          {pwSuccess && (
            <span className="text-sm font-medium text-emerald-600">Password updated successfully</span>
          )}
        </div>
      </div>
    </>
  )
}
