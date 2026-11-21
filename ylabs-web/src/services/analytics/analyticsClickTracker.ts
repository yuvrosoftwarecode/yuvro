/**
 * Deliberate Interaction & Meaningful Click Tracker for YLabs.
 *
 * Implements:
 * - Controlled event delegation via `data-analytics-*` attributes
 * - Explicit exclusions: Monaco, CodeMirror, xterm, text inputs, password fields, chat textareas
 * - Automatic outbound link tracking with URL query-string stripping
 * - Accidental double-click debouncing (500ms)
 * - Safe programmatic helper hook `useTrackClick`
 */

import { analytics } from "./analytics.ts";
import {
  GA4_EVENTS,
  sanitizeUrl,
  type ClickActionParams,
  type GA4EventName,
} from "./analyticsEvents.ts";

const clickDebounceMap = new Map<string, number>();

/**
 * Checks if a click on an element/action should be debounced to prevent duplicate hits.
 */
export function isClickDebounced(key: string, windowMs = 500): boolean {
  const now = Date.now();
  const last = clickDebounceMap.get(key);
  if (last && now - last < windowMs) {
    return true;
  }
  clickDebounceMap.set(key, now);

  if (clickDebounceMap.size > 150) {
    for (const [k, timestamp] of clickDebounceMap.entries()) {
      if (now - timestamp > 5000) {
        clickDebounceMap.delete(k);
      }
    }
  }
  return false;
}

/**
 * Checks whether an element or its ancestors should be excluded from click tracking.
 * Excludes:
 * - Explicit ignores (`data-no-analytics`, `data-analytics-ignore`)
 * - Code editors (Monaco, CodeMirror, etc.)
 * - Terminals (xterm, .terminal)
 * - Form inputs, passwords, chat textareas, contenteditable
 */
export function shouldIgnoreClick(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") {
    return true;
  }
  const el = target as Element;

  // 1. Explicit opt-out attribute
  if (el.closest("[data-no-analytics], [data-analytics-ignore]")) {
    return true;
  }

  // 2. High-frequency surfaces / code editors / terminals
  if (
    el.closest(
      ".monaco-editor, .monaco-diff-editor, .cm-editor, .cm-scroller, .xterm, .terminal, [data-lexical-editor]",
    )
  ) {
    return true;
  }

  // 3. Form inputs, password fields, search inputs, textareas, contenteditable
  if (el.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
    return true;
  }

  return false;
}

/**
 * Infers page category from current route path.
 */
export function getPageCategory(pathname?: string): "student" | "recruiter" | "admin" | "public" {
  const path = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  if (path.startsWith("/student")) return "student";
  if (path.startsWith("/recruiter")) return "recruiter";
  if (path.startsWith("/admin")) return "admin";
  return "public";
}

/**
 * Determines destination category from a link URL.
 */
export function getDestinationCategory(
  urlStr: string,
): "student" | "recruiter" | "admin" | "external" {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yuvrolabs.com";
    const currentHost = typeof window !== "undefined" ? window.location.host : "";
    const parsed = new URL(urlStr, origin);

    if (
      parsed.protocol.startsWith("http") &&
      parsed.host &&
      currentHost &&
      parsed.host !== currentHost
    ) {
      return "external";
    }

    const path = parsed.pathname;
    if (path.startsWith("/student")) return "student";
    if (path.startsWith("/recruiter")) return "recruiter";
    if (path.startsWith("/admin")) return "admin";
    return "external";
  } catch {
    return "external";
  }
}

/**
 * Delegated document click handler.
 */
export function handleDelegatedClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target || shouldIgnoreClick(target)) {
    return;
  }

  // 1. Check for explicit data-analytics-action
  const actionEl = target.closest<HTMLElement>("[data-analytics-action]");
  if (actionEl) {
    const actionName = actionEl.getAttribute("data-analytics-action");
    if (!actionName) return;

    const rawComp = actionEl.getAttribute("data-analytics-component");
    let componentType: "button" | "link" | "card" | "tab" | "navigation" = "button";
    if (
      rawComp &&
      (rawComp === "button" ||
        rawComp === "link" ||
        rawComp === "card" ||
        rawComp === "tab" ||
        rawComp === "navigation")
    ) {
      componentType = rawComp;
    } else if (actionEl.tagName.toLowerCase() === "a") {
      componentType = "link";
    } else if (actionEl.tagName.toLowerCase() === "button") {
      componentType = "button";
    }

    const rawCat = actionEl.getAttribute("data-analytics-category");
    const pageCat: "student" | "recruiter" | "admin" | "public" =
      rawCat === "student" || rawCat === "recruiter" || rawCat === "admin" || rawCat === "public"
        ? rawCat
        : getPageCategory();
    const customEvent = actionEl.getAttribute("data-analytics-event") as GA4EventName | undefined;

    let destinationUrl: string | undefined;
    let destinationCat: "student" | "recruiter" | "admin" | "external" | undefined;

    if (actionEl.tagName.toLowerCase() === "a") {
      const href = (actionEl as HTMLAnchorElement).href;
      if (href) {
        destinationUrl = sanitizeUrl(href);
        destinationCat = getDestinationCategory(href);
      }
    }

    const dedupeKey = `${actionName}::${componentType}::${destinationUrl || ""}`;
    if (isClickDebounced(dedupeKey, 500)) {
      return;
    }

    analytics.trackClick(
      {
        component_type: componentType,
        action_name: actionName,
        page_category: pageCat,
        ...(destinationCat ? { destination_category: destinationCat } : {}),
        ...(destinationUrl ? { destination_url: destinationUrl } : {}),
      },
      customEvent,
    );
    return;
  }

  // 2. Check for outbound <a> links
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (anchor && anchor.href) {
    const href = anchor.href;
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://yuvrolabs.com";
      const currentHost = typeof window !== "undefined" ? window.location.host : "";
      const parsed = new URL(href, origin);

      if (
        parsed.protocol.startsWith("http") &&
        parsed.host &&
        currentHost &&
        parsed.host !== currentHost
      ) {
        const sanitizedUrl = sanitizeUrl(href);
        const dedupeKey = `outbound::${sanitizedUrl}`;
        if (isClickDebounced(dedupeKey, 500)) {
          return;
        }

        analytics.trackClick(
          {
            component_type: "link",
            action_name: "outbound_link",
            page_category: getPageCategory(),
            destination_category: "external",
            destination_url: sanitizedUrl,
          },
          GA4_EVENTS.OUTBOUND_CLICK,
        );
      }
    } catch {
      // Ignore unparseable hrefs
    }
  }
}

/**
 * Initializes global click delegation listener on `document`.
 * Returns a teardown cleanup function.
 */
export function initClickTracking(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  document.addEventListener("click", handleDelegatedClick, { capture: true });
  return () => {
    document.removeEventListener("click", handleDelegatedClick, { capture: true });
  };
}

/**
 * React hook for components needing direct programmatic click tracking.
 */
export function useTrackClick() {
  return {
    trackClick: (params: ClickActionParams, eventName?: GA4EventName) =>
      analytics.trackClick(params, eventName),
  };
}
