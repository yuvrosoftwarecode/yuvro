export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export const linkCls = 'font-medium underline hover:text-[#B45F06]'

export const mutedLinkCls = 'text-sm text-muted-foreground underline hover:text-foreground'

export const inputCls =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-[15px] focus:border-primary focus:outline-none disabled:text-muted-foreground'

export type Role = 'owner' | 'recruiter'

export interface TeamUser {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'invited'
  addedAt: string
}

export interface Plan {
  id: string
  name: string
  submissions: number | null
  users: number | null
  evaluations: number | null
}

export interface Usage {
  key: 'submissions' | 'users' | 'evaluations' | 'invites'
  label: string
  used: number
  limit: number | null
  note?: string
}

export interface Invoice {
  id: string
  date: string
  amount: number
  url: string
}
