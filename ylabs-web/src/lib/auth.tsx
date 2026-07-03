import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "student" | "admin" | "job_seeker" | "recruiter";
export interface AuthUser { email: string; name: string; role: Role; }

const KEY = "yuvro-auth";

interface AuthCtx {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);
  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(KEY, JSON.stringify(u)); } catch {}
  };
  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(KEY); } catch {}
  };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  "student@yuvrolabs.com": { password: "student123", user: { email: "student@yuvrolabs.com", name: "Alex Student", role: "student" } },
  
  "admin@yuvrolabs.com": { password: "admin123", user: { email: "admin@yuvrolabs.com", name: "Admin Yuvro", role: "admin" } },
};
