/**
 * Custom React Hook for Google Analytics 4 tracking across YLabs components.
 */

import { useCallback } from "react";
import analytics from "./analytics.ts";
import type { GA4EventName, GA4EventParamsMap, PageViewParams } from "./analyticsEvents.ts";

export function useAnalytics() {
  const trackEvent = useCallback(
    <T extends GA4EventName>(eventName: T, params?: GA4EventParamsMap[T]) => {
      analytics.trackEvent(eventName, params);
    },
    [],
  );

  const trackPageView = useCallback((params?: Partial<PageViewParams>) => {
    analytics.trackPageView(params);
  }, []);

  return {
    trackEvent,
    trackPageView,
    isEnabled: analytics.isEnabled(),
    isInitialized: analytics.isInitialized(),
  };
}

export default useAnalytics;
