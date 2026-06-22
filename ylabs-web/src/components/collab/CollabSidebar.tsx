import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Flag, Users, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/collaboration", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collaboration/browse", label: "Sprints", icon: Flag },
  { to: "/collaboration/squads", label: "My Squad", icon: Users },
  { to: "/collaboration/connections", label: "Connections", icon: Link2 },
];

export function CollabSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={`hidden md:flex flex-col border-r bg-card transition-[width] duration-300 ${collapsed ? "w-[60px]" : "w-[220px]"}`}>
      <div className="flex items-center justify-end p-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="grid h-6 w-6 place-items-center rounded hover:bg-accent text-muted-foreground"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const active = path === item.to || (item.to !== "/collaboration" && path.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
              title={item.label}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
