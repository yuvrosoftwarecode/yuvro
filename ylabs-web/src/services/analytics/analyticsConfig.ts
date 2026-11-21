/**
 * Google Analytics 4 (GA4) Configuration and Environment Detection for YLabs.
 *
 * Analytics enablement is controlled exclusively via VITE_ANALYTICS_ENABLED
 * and GA4 Measurement ID validation.
 */

export interface AnalyticsEnvConfig {
  measurementId?: string;
  analyticsEnabled?: string | boolean;
  appEnv?: string;
  isDev?: boolean;
  hostname?: string;
}

export interface AnalyticsDecision {
  allowed: boolean;
  reason: string;
  measurementId: string;
}

interface RuntimeEnvWindow extends Window {
  __ENV__?: Record<string, string | boolean | undefined>;
}

/**
 * Checks if a given hostname represents a local/loopback environment.
 * Retained for informational and debugging utility.
 */
export function isLocalHostname(hostname: string | undefined | null): boolean {
  if (!hostname) return false;
  let h = hostname.trim().toLowerCase();

  // Strip brackets if IPv6 like [::1] or [::1]:3000
  if (h.startsWith("[")) {
    const closeBracket = h.indexOf("]");
    if (closeBracket !== -1) {
      h = h.slice(1, closeBracket);
    }
  }

  // Handle IPv6 loopback
  if (h === "::1") {
    return true;
  }

  // Strip port if IPv4 or hostname like localhost:3000 or 127.0.0.1:8080
  const cleanHost = h.includes(":") && !h.includes("::") ? h.split(":")[0] : h;

  return (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1" ||
    cleanHost === "0.0.0.0" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal")
  );
}

/**
 * Detects whether the current environment is a local development environment.
 * Retained for informational and logging utility; does not block analytics.
 */
export function isLocalEnvironment(options?: AnalyticsEnvConfig): boolean {
  // 1. Check DEV flag (Vite's default dev server mode)
  const isDev =
    options?.isDev ??
    (typeof import.meta !== "undefined" && import.meta.env ? Boolean(import.meta.env.DEV) : false);
  if (isDev) {
    return true;
  }

  // 2. Check runtime browser hostname (covers local Vite preview, local Docker containers)
  let runtimeHost = options?.hostname;
  if (!runtimeHost && typeof window !== "undefined" && window.location) {
    runtimeHost = window.location.hostname;
  }
  if (runtimeHost && isLocalHostname(runtimeHost)) {
    return true;
  }

  // 3. Check explicit APP_ENV or DEPLOY_ENV indicating local
  const runtimeEnv =
    typeof window !== "undefined" ? (window as unknown as RuntimeEnvWindow).__ENV__ : undefined;

  const appEnv = String(
    options?.appEnv ??
      runtimeEnv?.VITE_APP_ENV ??
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_ENV
        ? String(import.meta.env.VITE_APP_ENV)
        : ""),
  ).toLowerCase();

  if (appEnv === "local" || appEnv === "development") {
    if (!runtimeHost || isLocalHostname(runtimeHost)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates whether a GA4 Measurement ID is properly formatted (e.g., G-XXXXXXXXXX)
 * and not a dummy placeholder.
 */
export function isValidMeasurementId(id: string | undefined | null): boolean {
  if (!id || typeof id !== "string") return false;
  const trimmed = id.trim().toUpperCase();

  // Must match G- followed by alphanumeric characters
  const ga4Regex = /^G-[A-Z0-9]{4,15}$/;
  if (!ga4Regex.test(trimmed)) {
    return false;
  }

  // Disallow common placeholders
  const placeholderPatterns = [
    /^G-X+$/i,
    /^G-0+$/,
    /^G-YOUR_MEASUREMENT_ID$/i,
    /^G-PLACEHOLDER$/i,
    /^G-MEASUREMENT_ID$/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  return true;
}

/**
 * Parses a boolean flag from string, boolean, or undefined.
 * Returns true if value is true, "true", "1", "yes", or "on" (case-insensitive).
 * Returns false otherwise.
 */
export function isAnalyticsEnabled(val: string | boolean | undefined | null): boolean {
  if (val === true) return true;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
  }
  return false;
}

/**
 * Checks if analytics has been explicitly disabled or not enabled via environment flag.
 */
export function isAnalyticsExplicitlyDisabled(val: string | boolean | undefined | null): boolean {
  return !isAnalyticsEnabled(val);
}

/**
 * Primary decision function: determines if GA4 tracking should initialize.
 *
 * Rules:
 * 1. SSR / Non-browser: Disabled.
 * 2. If VITE_ANALYTICS_ENABLED is false, return allowed: false.
 * 3. If VITE_ANALYTICS_ENABLED is true, validate the Measurement ID.
 * 4. If the Measurement ID is invalid or missing, return allowed: false.
 * 5. If both checks pass, return allowed: true.
 *
 * Enablement is controlled exclusively by VITE_ANALYTICS_ENABLED.
 * Neither LOCAL nor DEV is automatically excluded.
 */
export function shouldInitializeAnalytics(overrides?: AnalyticsEnvConfig): AnalyticsDecision {
  // 1. SSR safeguard
  if (typeof window === "undefined" && !overrides?.hostname) {
    return {
      allowed: false,
      reason: "Server-side rendering or non-browser execution environment.",
      measurementId: "",
    };
  }

  // 2. Resolve configuration values (supporting runtime window.__ENV__ for promoted containers)
  const runtimeEnv =
    typeof window !== "undefined" ? (window as unknown as RuntimeEnvWindow).__ENV__ : undefined;

  const measurementId = String(
    overrides?.measurementId ??
      runtimeEnv?.VITE_GA4_MEASUREMENT_ID ??
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA4_MEASUREMENT_ID
        ? String(import.meta.env.VITE_GA4_MEASUREMENT_ID)
        : ""),
  ).trim();

  const analyticsEnabledRaw =
    overrides?.analyticsEnabled ??
    runtimeEnv?.VITE_ANALYTICS_ENABLED ??
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_ANALYTICS_ENABLED !== undefined
      ? import.meta.env.VITE_ANALYTICS_ENABLED
      : undefined);

  // 3. VITE_ANALYTICS_ENABLED check
  if (!isAnalyticsEnabled(analyticsEnabledRaw)) {
    return {
      allowed: false,
      reason: "Analytics disabled: VITE_ANALYTICS_ENABLED is false or not set.",
      measurementId,
    };
  }

  // 4. Measurement ID validation
  if (!isValidMeasurementId(measurementId)) {
    return {
      allowed: false,
      reason: `Analytics disabled: invalid or missing GA4 Measurement ID (${measurementId || "empty"}).`,
      measurementId: "",
    };
  }

  // All checks passed -> Analytics enabled
  return {
    allowed: true,
    reason: "Analytics enabled: VITE_ANALYTICS_ENABLED is true with valid Measurement ID.",
    measurementId,
  };
}
