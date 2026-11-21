/**
 * Centralized Google Analytics 4 (GA4) Service for YLabs.
 *
 * Provides:
 * - Dynamic gtag.js loading (unconditional in allowed deployed environments)
 * - Strict environment validation (local development guaranteed disabled)
 * - Single initialization guard
 * - Manual SPA page tracking with automatic route deduplication
 * - Typed custom event tracking with parameter allowlisting and PII filtering
 * - Stable lifecycle-based deduplication across re-renders, navigation, and page refreshes
 * - Graceful fallback ensuring analytics failure never breaks YLabs
 */

import {
  shouldInitializeAnalytics,
  type AnalyticsDecision,
  type AnalyticsEnvConfig,
} from "./analyticsConfig.ts";
import {
  GA4_EVENTS,
  sanitizeEventParams,
  sanitizeUrl,
  type ClickActionParams,
  type GA4EventName,
  type GA4EventParamsMap,
  type PageViewParams,
} from "./analyticsEvents.ts";

// Global window declarations for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

class AnalyticsService {
  private initialized: boolean = false;
  private enabled: boolean = false;
  private measurementId: string = "";
  private lastPageViewKey: string = "";
  private lastPageViewTime: number = 0;
  private eventDeduplicationCache = new Map<string, number>();
  private lifecycleDedupeCache = new Set<string>();

  /**
   * Initializes Google Analytics 4 if and only if permitted by environment validation.
   * Guaranteed to be idempotent and safe to call multiple times.
   */
  public init(overrides?: AnalyticsEnvConfig): boolean {
    if (this.initialized) {
      return this.enabled;
    }

    try {
      const decision: AnalyticsDecision = shouldInitializeAnalytics(overrides);

      if (!decision.allowed) {
        this.initialized = true;
        this.enabled = false;
        // In local environments or when disabled, report diagnostic info in dev console without errors
        if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
          console.info(`[Analytics] ${decision.reason}`);
        }
        return false;
      }

      this.measurementId = decision.measurementId;

      // Ensure window and document exist (browser environment)
      if (typeof window === "undefined" || typeof document === "undefined") {
        this.initialized = true;
        this.enabled = false;
        return false;
      }

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];

      // Define gtag helper if not already defined (Google Tag requires Arguments object rather than Array)
      if (typeof window.gtag !== "function") {
        window.gtag = function () {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer.push(arguments);
        };
      }

      // 1. Load gtag.js dynamically if not already injected
      const scriptId = "ga4-gtag-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
        script.onerror = () => {
          console.warn("[Analytics] Google tag script failed to load or was blocked by client.");
        };
        document.head.appendChild(script);
      }

      // 2. Initialize gtag timestamp and configure measurement ID with sanitized URLs
      const initialLocation = sanitizeUrl(window.location.href);
      const initialReferrer = document.referrer ? sanitizeUrl(document.referrer) : undefined;

      window.gtag("js", new Date());
      window.gtag("config", this.measurementId, {
        send_page_view: false, // Manual SPA page view tracking enabled
        page_location: initialLocation,
        ...(initialReferrer ? { page_referrer: initialReferrer } : {}),
      });

      // Globally set sanitized location and referrer so default hit collection (dl, dr) never leaks raw UUIDs
      window.gtag("set", {
        page_location: initialLocation,
        ...(initialReferrer ? { page_referrer: initialReferrer } : {}),
      });

      this.initialized = true;
      this.enabled = true;
      return true;
    } catch (err) {
      // Graceful failure: analytics errors must never crash YLabs
      console.warn("[Analytics] Initialization caught error:", err);
      this.initialized = true;
      this.enabled = false;
      return false;
    }
  }

  /**
   * Returns whether analytics has completed initialization check.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Returns whether analytics is actively enabled and sending hits.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Returns the active measurement ID if enabled.
   */
  public getMeasurementId(): string {
    return this.measurementId;
  }

  /**
   * Tracks an SPA page view with sanitized title, location, and path.
   * Includes duplicate protection for rapid re-renders.
   */
  public trackPageView(params?: Partial<PageViewParams>): void {
    if (!this.enabled || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    try {
      const pageTitle = params?.page_title || document.title || "YLabs";
      const rawLocation = params?.page_location || window.location.href;
      const sanitizedLocation = sanitizeUrl(rawLocation);
      const pagePath = params?.page_path || window.location.pathname + window.location.search;
      const sanitizedPath = sanitizeUrl(pagePath);
      const pageReferrer = params?.page_referrer ? sanitizeUrl(params.page_referrer) : undefined;

      // Deduplication: prevent firing identical page_views within 300ms
      const now = Date.now();
      const pvKey = `${sanitizedLocation}::${pageTitle}`;
      if (this.lastPageViewKey === pvKey && now - this.lastPageViewTime < 300) {
        return;
      }

      this.lastPageViewKey = pvKey;
      this.lastPageViewTime = now;

      // Update global gtag default parameters so all subsequent hits inherit sanitized paths/locations
      window.gtag("set", {
        page_location: sanitizedLocation,
        page_path: sanitizedPath,
        ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
      });

      const payload: PageViewParams = {
        page_title: pageTitle,
        page_location: sanitizedLocation,
        page_path: sanitizedPath,
        ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
      };

      const sanitizedPayload = sanitizeEventParams(
        GA4_EVENTS.PAGE_VIEW,
        payload as unknown as Record<string, unknown>,
      );

      window.gtag("event", GA4_EVENTS.PAGE_VIEW, sanitizedPayload);
    } catch (e) {
      console.warn("[Analytics] trackPageView encountered error:", e);
    }
  }

  /**
   * Tracks deliberate user UI interactions (buttons, links, navigation, cards, tabs)
   * with strict component typing, parameter allowlisting, and URL sanitization.
   */
  public trackClick(params: ClickActionParams, eventName?: GA4EventName): void {
    if (!this.enabled || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    try {
      const targetEvent = eventName || GA4_EVENTS.CLICK_ACTION;
      const runtimeEnv =
        typeof window !== "undefined"
          ? (window as unknown as { __ENV__?: Record<string, string | boolean | undefined> })
              .__ENV__
          : undefined;
      const appEnv =
        params.app_env ||
        (runtimeEnv?.VITE_APP_ENV ? String(runtimeEnv.VITE_APP_ENV) : undefined) ||
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_ENV) ||
        "dev";

      const payload: ClickActionParams = {
        component_type: params.component_type,
        action_name: params.action_name,
        page_category: params.page_category,
        destination_category: params.destination_category,
        app_env: appEnv,
        ...(params.destination_url ? { destination_url: sanitizeUrl(params.destination_url) } : {}),
      };

      this.trackEvent(
        targetEvent as GA4EventName,
        payload as unknown as GA4EventParamsMap[GA4EventName],
      );
    } catch (e) {
      console.warn("[Analytics] trackClick encountered error:", e);
    }
  }

  /**
   * Derives a stable storage key for terminal lifecycle events to prevent duplicate
   * tracking across component re-renders, route changes, and page refreshes.
   */
  private getLifecycleStorageKey(
    eventName: GA4EventName,
    rawParams?: Record<string, unknown>,
  ): string | null {
    if (eventName === GA4_EVENTS.LAB_COMPLETED && rawParams?.lab_id) {
      const instance = rawParams.instance_id || rawParams.submission_id || rawParams.attempt_id;
      return instance ? `ga4_dedupe:lab_completed:${rawParams.lab_id}:${instance}` : null;
    }
    if (eventName === GA4_EVENTS.EVALUATION_COMPLETED) {
      const evalId =
        rawParams?.evaluation_id ||
        rawParams?.instance_id ||
        rawParams?.attempt_id ||
        rawParams?.session_id;
      return evalId ? `ga4_dedupe:eval_completed:${evalId}` : null;
    }
    if (eventName === GA4_EVENTS.INTERVIEW_COMPLETED && rawParams?.interview_id) {
      const instance = rawParams.instance_id || rawParams.session_id || rawParams.attempt_id;
      return instance
        ? `ga4_dedupe:interview_completed:${rawParams.interview_id}:${instance}`
        : null;
    }
    if (eventName === GA4_EVENTS.ONBOARDING_COMPLETED) {
      return "ga4_dedupe:onboarding_completed";
    }
    if (eventName === GA4_EVENTS.PASSWORD_RESET && rawParams?.step === "completed") {
      return "ga4_dedupe:password_reset_completed";
    }
    return null;
  }

  /**
   * Checks whether a milestone event has already been recorded in this session.
   */
  private isLifecycleDuplicate(
    eventName: GA4EventName,
    rawParams?: Record<string, unknown>,
  ): boolean {
    const key = this.getLifecycleStorageKey(eventName, rawParams);
    if (!key) return false;

    // Check in-memory set first
    if (this.lifecycleDedupeCache.has(key)) {
      return true;
    }

    // Check sessionStorage (survives page refresh within the same browser session)
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        if (window.sessionStorage.getItem(key) === "1") {
          this.lifecycleDedupeCache.add(key);
          return true;
        }
      }
    } catch {
      // sessionStorage may be restricted in sandboxed environments
    }

    return false;
  }

  /**
   * Marks a milestone event as completed in both memory and sessionStorage.
   */
  private markLifecycleCompleted(
    eventName: GA4EventName,
    rawParams?: Record<string, unknown>,
  ): void {
    const key = this.getLifecycleStorageKey(eventName, rawParams);
    if (!key) return;

    this.lifecycleDedupeCache.add(key);

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, "1");
      }
    } catch {
      // Ignore storage write issues
    }
  }

  /**
   * Tracks a custom GA4 event using strict typed parameters, allowlist filtering,
   * PII sanitization, and lifecycle deduplication.
   */
  public trackEvent<T extends GA4EventName>(eventName: T, params?: GA4EventParamsMap[T]): void {
    if (!this.enabled || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    try {
      const rawParams = (params || {}) as Record<string, unknown>;

      // 1. Lifecycle deduplication for terminal business events
      // Prevents re-firing on component re-renders, navigation, or page refreshes
      if (this.isLifecycleDuplicate(eventName, rawParams)) {
        return;
      }

      // 2. Clean and sanitize parameters against allowlist and PII check
      const sanitized = sanitizeEventParams(eventName, rawParams);

      // 3. Short-term debounce for submissions, downloads, and rapid duplicate calls
      const now = Date.now();
      const lifecycleKey = this.getLifecycleStorageKey(eventName, rawParams);
      let dedupeKey = lifecycleKey || `${eventName}::${JSON.stringify(sanitized)}`;
      let debounceWindowMs = 1000;

      if (eventName === GA4_EVENTS.TASK_SUBMITTED) {
        dedupeKey = `${eventName}::${sanitized.lab_id}::${sanitized.task_id}::${sanitized.status}`;
        debounceWindowMs = 5000;
      } else if (eventName === GA4_EVENTS.REPORT_DOWNLOADED) {
        dedupeKey = `${eventName}::${sanitized.report_type}::${sanitized.format}`;
        debounceWindowMs = 3000;
      }

      const lastFired = this.eventDeduplicationCache.get(dedupeKey);
      if (lastFired && now - lastFired < debounceWindowMs) {
        return;
      }
      this.eventDeduplicationCache.set(dedupeKey, now);

      // Clean old entries to avoid memory growth
      if (this.eventDeduplicationCache.size > 100) {
        for (const [k, timestamp] of this.eventDeduplicationCache.entries()) {
          if (now - timestamp > 10000) {
            this.eventDeduplicationCache.delete(k);
          }
        }
      }

      // 4. Mark lifecycle completion
      this.markLifecycleCompleted(eventName, rawParams);

      // 5. Dispatch event via Google Analytics
      window.gtag("event", eventName, sanitized);
    } catch (e) {
      console.warn(`[Analytics] trackEvent(${eventName}) encountered error:`, e);
    }
  }

  /**
   * Resets internal state for unit testing and test isolation.
   */
  public reset(): void {
    this.initialized = false;
    this.enabled = false;
    this.measurementId = "";
    this.lastPageViewKey = "";
    this.lastPageViewTime = 0;
    this.eventDeduplicationCache.clear();
    this.lifecycleDedupeCache.clear();
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith("ga4_dedupe:")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
      }
    } catch {
      // Ignore storage cleanup issues
    }
  }
}

export const analytics = new AnalyticsService();
export default analytics;
