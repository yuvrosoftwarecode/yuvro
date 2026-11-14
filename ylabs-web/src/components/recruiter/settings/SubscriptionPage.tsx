import { fmtDate, inr, linkCls, mutedLinkCls, type Plan, type Usage, type Invoice } from '@/lib/recruiterSettings'

function Meter({ u }: { u: Usage }) {
  const unlimited = u.limit == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((u.used / u.limit!) * 100))
  const left = unlimited ? 0 : u.limit! - u.used
  const note =
    u.note ??
    (!unlimited && pct >= 100
      ? 'Limit reached'
      : !unlimited && pct >= 90
        ? `${left} left. New ${u.label.toLowerCase()} will be blocked at the limit.`
        : '')
  return (
    <div className="mb-6">
      <div className="flex justify-between text-[15px]">
        <span className="font-medium text-foreground">{u.label}</span>
        <span>
          <b className="font-semibold text-foreground">{u.used}</b>
          {!unlimited && <span className="text-muted-foreground"> of {u.limit}</span>}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {note && (
        <p className={`mt-1.5 text-sm ${pct >= 100 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
          {note}
        </p>
      )}
    </div>
  )
}

const fmtLimit = (n: number | null, suffix = '') =>
  n == null ? 'Unlimited' : `${n.toLocaleString('en-IN')}${suffix}`

export function SubscriptionPage({
  plan,
  billing,
  renewsAt,
  resetsAt,
  usage,
  plans,
  billingEmail,
  invoices,
  onUpgrade,
  onDowngrade,
  onChangeEmail,
  onContactSales,
}: {
  plan: Plan
  billing: 'monthly' | 'yearly'
  renewsAt: string
  resetsAt: string
  usage: Usage[]
  plans: Plan[]
  billingEmail: string
  invoices: Invoice[]
  onUpgrade: (planId: string) => void
  onDowngrade: (planId: string) => void
  onChangeEmail: () => void
  onContactSales: () => void
}) {
  const idx = plans.findIndex((p) => p.id === plan.id)
  const top = idx >= 0 && idx === plans.length - 1
  return (
    <>
      <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
        <div>
          <h2>Subscription and limits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} plan · Billed {billing} · Renews on {fmtDate(renewsAt)}
          </p>
        </div>
        {top ? (
          <button className={linkCls} onClick={onContactSales}>
            Contact sales
          </button>
        ) : (
          <button
            className="rounded-md bg-primary px-4 py-2.5 text-[15px] font-medium text-primary-foreground hover:bg-[#E5820F] transition-colors"
            onClick={() => onUpgrade(plans[Math.max(0, idx + 1)]?.id || plans[0].id)}
          >
            Upgrade plan
          </button>
        )}
      </div>

      <h3 className="mb-5">
        Usage this month{' '}
        <span className="font-normal text-muted-foreground">· resets on {fmtDate(resetsAt)}</span>
      </h3>
      {usage.map((u) => (
        <Meter key={u.key} u={u} />
      ))}

      <div className="mt-8 border-t border-border pt-7">
        <h3 className="mb-3">Plans</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
            <div className="grid grid-cols-[1fr_120px_100px_120px_90px] gap-3 py-2.5 text-sm font-medium text-muted-foreground">
              <div>Plan</div>
              <div>Submissions</div>
              <div>Users</div>
              <div>Evaluations</div>
              <div />
            </div>
            {plans.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_120px_100px_120px_90px] items-center gap-3 border-t border-border py-3.5 last:border-b"
              >
                <div className="font-medium text-foreground">
                  {p.name}
                  {p.id === plan.id ? ' (current)' : ''}
                </div>
                <div className="text-muted-foreground">{fmtLimit(p.submissions, ' / month')}</div>
                <div className="text-muted-foreground">{fmtLimit(p.users)}</div>
                <div className="text-muted-foreground">{fmtLimit(p.evaluations)}</div>
                <div className="text-right">
                  {p.id === plan.id ? (
                    <span className="text-muted-foreground">Current</span>
                  ) : i > idx ? (
                    <button className={linkCls} onClick={() => onUpgrade(p.id)}>
                      Upgrade
                    </button>
                  ) : (
                    <button className={mutedLinkCls} onClick={() => onDowngrade(p.id)}>
                      Downgrade
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Need more than this?{' '}
          <button className={linkCls} onClick={onContactSales}>
            Contact sales
          </button>
        </p>
      </div>

      <div className="mt-8 border-t border-border pt-7">
        <h3>Billing</h3>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Invoices go to {billingEmail} ·{' '}
          <button className={mutedLinkCls} onClick={onChangeEmail}>
            Change
          </button>
        </p>
        {invoices.length === 0 && <p className="py-3 text-muted-foreground">No invoices yet</p>}
        {invoices.slice(0, 3).map((inv) => (
          <div key={inv.id} className="flex justify-between border-b border-border py-3 text-[15px]">
            <span className="text-foreground">{fmtDate(inv.date)}</span>
            <span className="text-muted-foreground">
              {inr(inv.amount)} &nbsp;&nbsp;{' '}
              <a href={inv.url} className={mutedLinkCls}>
                Download
              </a>
            </span>
          </div>
        ))}
        {invoices.length > 3 && (
          <p className="mt-3">
            <button className={mutedLinkCls}>View all invoices</button>
          </p>
        )}
      </div>
    </>
  )
}
