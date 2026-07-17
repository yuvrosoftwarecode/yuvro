import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";

export function EvalShell({ children, step, totalSteps, stepLabel }: { children: ReactNode; step?: number; totalSteps?: number; stepLabel?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="eval-theme min-h-screen bg-[#fafaf7] text-neutral-900 antialiased selection:bg-neutral-900 selection:text-white">
      <header className="border-b border-neutral-200/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <YMark />
            <span className="text-[13px] font-medium tracking-tight">Yuvro Labs</span>
          </Link>
          <div className="flex items-center gap-6 text-[12px] text-neutral-500">
            {step && totalSteps && stepLabel && (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="font-mono text-[11px] tracking-widest text-neutral-400">
                  {String(step).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
                </span>
                <span className="text-neutral-300">·</span>
                <span>{stepLabel}</span>
              </div>
            )}
            <a href="mailto:support@yuvrolabs.com" className="hover:text-neutral-900 transition">Need help?</a>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900"
            >
              {theme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              )}
            </button>
          </div>
        </div>
        {step && totalSteps && (
          <div className="mx-auto h-px max-w-6xl px-6">
            <div className="h-px bg-neutral-200/80">
              <div className="h-px bg-neutral-900 transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16 lg:py-24">{children}</main>
      <footer className="border-t border-neutral-200/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 text-[11px] text-neutral-500">
          <span>© 2026 Yuvro Labs</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-neutral-900 transition">Privacy</a>
            <a href="#" className="hover:text-neutral-900 transition">Terms</a>
            <a href="#" className="hover:text-neutral-900 transition">Accessibility</a>
          </div>
        </div>
      </footer>
      <style>{`
        .eval-input { width: 100%; border: 0; border-bottom: 1px solid rgb(212 212 212); background: transparent; padding: 8px 0; font-size: 15px; color: rgb(23 23 23); }
        .eval-input::placeholder { color: rgb(163 163 163); }
        .eval-input:focus { outline: none; border-color: rgb(23 23 23); }
      `}</style>
    </div>
  );
}

export function EvalStepHeader({ eyebrow, title, body }: { eyebrow?: string; title: ReactNode; body?: string }) {
  return (
    <div>
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium tracking-wide text-neutral-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {eyebrow}
        </div>
      )}
      <h1 className="mt-8 font-serif text-[44px] leading-[1.05] tracking-tight text-neutral-900 sm:text-[52px]">{title}</h1>
      {body && <p className="mt-6 max-w-md text-[15px] leading-relaxed text-neutral-600">{body}</p>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[12px] font-medium text-neutral-900">{label}</label>
        {hint && <span className="text-[11px] text-neutral-400">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function PrimaryButton({ children, disabled, className = "", type = "submit", onClick }: { children: ReactNode; disabled?: boolean; className?: string; type?: "submit" | "button"; onClick?: () => void }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`group inline-flex w-full items-center justify-between rounded-lg bg-neutral-900 px-5 py-3.5 text-[14px] font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 ${className}`}
    >
      <span>{children}</span>
      <ArrowRight />
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 ${className}`}>
      {children}
    </button>
  );
}

export function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-0.5">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function YMark() {
  return <div className="grid h-7 w-7 place-items-center rounded-md bg-neutral-900 text-[11px] font-mono text-white">Y</div>;
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={`animate-spin ${className}`} fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
