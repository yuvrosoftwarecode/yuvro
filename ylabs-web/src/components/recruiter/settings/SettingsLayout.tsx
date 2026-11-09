import React from 'react'

export interface SettingsTabItem {
  id: 'account' | 'users' | 'subscription'
  label: string
  owner: boolean
}

export function SettingsLayout({
  activeTab,
  onTabChange,
  isOwner,
  children,
}: {
  activeTab: 'account' | 'users' | 'subscription'
  onTabChange: (tab: 'account' | 'users' | 'subscription') => void
  isOwner: boolean
  children: React.ReactNode
}) {
  const links: SettingsTabItem[] = [
    { id: 'account', label: 'Account', owner: false },
    { id: 'users', label: 'Users', owner: true },
    { id: 'subscription', label: 'Subscription and limits', owner: true },
  ].filter((l) => isOwner || !l.owner) as SettingsTabItem[]

  return (
    <div className="settings-theme mx-auto max-w-7xl p-6 sm:p-8 lg:p-10">
      <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Settings</h1>
      <div className="mt-7 flex flex-col md:flex-row gap-8 md:gap-14">
        <nav className="flex w-full md:w-[200px] shrink-0 flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {links.map((l) => {
            const isActive = activeTab === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onTabChange(l.id)}
                className={`rounded-md px-3 py-2 text-left text-[15px] transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-nav-active font-medium text-foreground'
                    : 'text-secondary-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {l.label}
              </button>
            )
          })}
        </nav>
        <div className="min-w-0 max-w-[760px] flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
