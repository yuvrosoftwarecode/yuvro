import React, { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert } from "lucide-react";

interface DevToolsShieldProps {
  children: React.ReactNode;
  onViolation?: (type: string, data?: any) => void;
  enabled?: boolean;
}

/**
 * Checks if a keyboard event corresponds to any DevTools or source-inspecting shortcut
 * on Windows, Linux, and macOS across international keyboard layouts.
 */
function isDevToolsShortcut(e: KeyboardEvent): boolean {
  const code = (e.code || "").toLowerCase();
  const key = (e.key || "").toLowerCase();
  const keyCode = e.keyCode || e.which;

  // F12 key (Windows, Linux, Mac)
  if (key === "f12" || code === "f12" || keyCode === 123) {
    return true;
  }

  // Shift + F10 or ContextMenu key (triggers context menu via keyboard)
  if ((e.shiftKey && (key === "f10" || code === "f10" || keyCode === 121)) || key === "contextmenu" || code === "contextmenu") {
    return true;
  }

  const ctrl = e.ctrlKey;
  const meta = e.metaKey; // Cmd on Mac
  const alt = e.altKey;   // Option on Mac
  const shift = e.shiftKey;
  const ctrlOrMeta = ctrl || meta;

  // Key codes and character normalizations for letters used in devtools shortcuts:
  // I, J, C, K, E, S, M, D, U, P
  // On Mac, Option + letter produces special dead characters/symbols (e.g. Option+I -> î or ˆ, Option+J -> ∆, Option+C -> ç, Option+U -> ¨)
  const isTargetLetter =
    ["keyi", "keyj", "keyc", "keyk", "keye", "keys", "keym", "keyd", "keyu", "keyp"].includes(code) ||
    ["i", "j", "c", "k", "e", "s", "m", "d", "u", "p", "ˆ", "∆", "ç", "¨", "", "´", "ß", "µ", "î", "π"].includes(key) ||
    [73, 74, 67, 75, 69, 83, 77, 68, 85, 80].includes(keyCode);

  // 1. Windows / Linux: Ctrl + Shift + [I, J, C, K, E, S, M, D, P]
  if (ctrl && shift && isTargetLetter) {
    return true;
  }

  // 2. Windows / Linux: Ctrl + Alt + [I, J, C]
  if (ctrl && alt && isTargetLetter) {
    return true;
  }

  // 3. macOS: Cmd + Option + [I, J, C, K, E, S, M, U]
  if (meta && alt && isTargetLetter) {
    return true;
  }

  // 4. macOS / Linux: Cmd + Shift + [I, J, C, K, M, S, P]
  if (meta && shift && isTargetLetter) {
    return true;
  }

  // 5. View Source: Ctrl + U or Cmd + U or Cmd + Option + U
  if (ctrlOrMeta && (code === "keyu" || key === "u" || keyCode === 85 || (meta && alt && key === "¨"))) {
    return true;
  }

  // 6. Save Page / Save As: Ctrl + S or Cmd + S
  if (ctrlOrMeta && !shift && !alt && (code === "keys" || key === "s" || keyCode === 83)) {
    return true;
  }

  return false;
}

export function DevToolsShield({ children, onViolation, enabled = true }: DevToolsShieldProps) {
  const [devToolsDetected, setDevToolsDetected] = useState(false);
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const lastViolationTimeRef = useRef<number>(0);

  const notifyViolation = useCallback((type: string, data?: any) => {
    const now = Date.now();
    // Throttle notifications to avoid spamming
    if (now - lastViolationTimeRef.current > 1500) {
      lastViolationTimeRef.current = now;
      if (onViolationRef.current) {
        onViolationRef.current(type, data);
      }
    }
  }, []);

  // ── 1. Block Context Menu (Right Click) Globally in Capture Phase ──────────
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      notifyViolation("right_click_detected", {
        x: e.clientX,
        y: e.clientY,
        description: "Right click blocked",
      });
      return false;
    };

    const handleAuxClick = (e: MouseEvent) => {
      // Button 2 is right-click
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("auxclick", handleAuxClick, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("auxclick", handleAuxClick, { capture: true });
    };
  }, [enabled, notifyViolation]);

  // ── 2. Block Keyboard Shortcuts Globally in Capture Phase ───────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        notifyViolation("devtools_opened", {
          key: e.key,
          code: e.code,
          description: "DevTools shortcut blocked",
        });
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isDevToolsShortcut(e)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [enabled, notifyViolation]);

  // ── 3. Active DevTools Detection (Window Size Differential & Console) ───────
  useEffect(() => {
    if (!enabled) return;

    let intervalId: any = null;

    const checkDevTools = () => {
      // Threshold: when DevTools is docked, window outer and inner dimensions differ noticeably
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      // Note: Fullscreen mode should not trigger false positives if outer equals inner
      const isOpen = widthDiff || heightDiff;

      setDevToolsDetected((prev) => {
        if (isOpen && !prev) {
          notifyViolation("devtools_opened", {
            description: "DevTools dock detection triggered",
          });
          return true;
        }
        if (!isOpen && prev) {
          return false;
        }
        return prev;
      });
    };

    // Run check on resize and periodically
    window.addEventListener("resize", checkDevTools, { passive: true });
    intervalId = setInterval(checkDevTools, 1000);
    checkDevTools();

    return () => {
      window.removeEventListener("resize", checkDevTools);
      if (intervalId) clearInterval(intervalId);
    };
  }, [enabled, notifyViolation]);

  return (
    <>
      <div className={devToolsDetected ? "filter blur-md pointer-events-none select-none transition-all duration-200" : ""}>
        {children}
      </div>

      {devToolsDetected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none"
        >
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-neutral-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Developer Tools Detected</h2>
            <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
              Developer tools, browser consoles, and page inspection are strictly forbidden during the evaluation.
            </p>
            <div className="mt-4 rounded-lg bg-red-950/40 border border-red-900/50 p-3 text-xs text-red-300">
              Please <strong>close Developer Tools</strong> to resume your session.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
