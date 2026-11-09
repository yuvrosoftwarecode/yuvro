import { useState } from 'react'
import { fmtDate, inputCls, linkCls, mutedLinkCls, type TeamUser } from '@/lib/recruiterSettings'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function UsersPage({
  users,
  limit,
  onInvite,
  onResend,
  onRemove,
  onUpgradePlan,
}: {
  users: TeamUser[]
  limit: number
  onInvite: (email: string, role: 'recruiter') => Promise<void>
  onResend: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onUpgradePlan?: () => void
}) {
  const used = users.length // invited users count toward the limit
  const full = used >= limit
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'recruiter'>('recruiter')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)

  const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  const err =
    !touched || !email
      ? ''
      : !EMAIL.test(email)
        ? 'Enter a valid email address'
        : exists
          ? 'This email already has access'
          : ''
  const canSend = !full && EMAIL.test(email) && !exists

  const handleInvite = async () => {
    if (!canSend || sending) return
    setSending(true)
    try {
      await onInvite(email.trim(), role)
      setEmail('')
      setTouched(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <h2>Users</h2>
      <p className="mb-7 mt-1 text-sm text-muted-foreground">Add recruiters who can sign in to this workspace</p>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-[28px] font-semibold leading-9 text-foreground">{used}</span>{' '}
          <span className="text-muted-foreground">of {limit} users added</span>
        </div>
        <span className="text-sm text-muted-foreground">{Math.max(limit - used, 0)} seats remaining</span>
      </div>
      <div className="mb-8 mt-2 h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Email address</label>
          <input
            className={inputCls}
            placeholder="name@company.com"
            value={email}
            disabled={full || sending}
            onBlur={() => setTouched(true)}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
          <select
            className={`${inputCls} w-full sm:w-[150px]`}
            value={role}
            disabled={full || sending}
            onChange={() => setRole('recruiter')}
          >
            <option value="recruiter">Recruiter</option>
          </select>
        </div>
        <button
          className="h-10 rounded-md bg-primary px-4 text-[15px] font-medium text-primary-foreground hover:bg-[#E5820F] disabled:bg-border disabled:text-muted-foreground transition-colors shrink-0"
          disabled={!canSend || sending}
          onClick={handleInvite}
        >
          {sending ? 'Sending...' : 'Send invite'}
        </button>
      </div>
      {err ? (
        <p className="mt-2 text-sm text-destructive">{err}</p>
      ) : full ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You have used all {limit} seats.{' '}
          <button
            type="button"
            onClick={onUpgradePlan}
            className={linkCls}
          >
            Upgrade plan
          </button>{' '}
          to add more users.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          They will get an email with a link to set a password and sign in
        </p>
      )}

      <div className="mt-10 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_190px] gap-3 py-2.5 text-sm font-medium text-muted-foreground">
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Added</div>
            <div />
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[minmax(0,1fr)_110px_100px_110px_190px] items-center gap-3 border-t border-border py-3.5 last:border-b"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {u.name}
                  {u.role === 'owner' ? ' (you)' : ''}
                </div>
                <div className="truncate text-sm text-muted-foreground" title={u.email}>
                  {u.email}
                </div>
              </div>
              <div className="text-foreground">{u.role === 'owner' ? 'Owner' : 'Recruiter'}</div>
              <div className={u.status === 'active' ? 'text-foreground' : 'text-muted-foreground'}>
                {u.status === 'active' ? 'Active' : 'Invited'}
              </div>
              <div className="text-sm text-muted-foreground">{fmtDate(u.addedAt)}</div>
              <div className="flex justify-end gap-4 text-right">
                {u.role === 'owner' ? null : confirmId === u.id ? (
                  <>
                    <span className="text-sm text-foreground">Remove this user?</span>
                    <button
                      className="text-sm font-medium underline hover:text-destructive text-destructive transition-colors"
                      onClick={async () => {
                        await onRemove(u.id)
                        setConfirmId(null)
                      }}
                    >
                      Yes, remove
                    </button>
                    <button className={mutedLinkCls} onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {u.status === 'invited' && (
                      <button className={mutedLinkCls} onClick={() => onResend(u.id)}>
                        Resend
                      </button>
                    )}
                    <button
                      className="text-sm text-muted-foreground underline hover:text-destructive transition-colors"
                      onClick={() => setConfirmId(u.id)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
