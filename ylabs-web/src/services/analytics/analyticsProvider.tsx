/**
 * Google Analytics Provider & Route Tracker for YLabs.
 *
 * Automatically tracks page views on initial load and TanStack Router route changes,
 * ensuring query string privacy sanitization and duplicate avoidance.
 */

import React, { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import analytics from "./analytics.ts";
import { initClickTracking } from "./analyticsClickTracker.ts";

interface AnalyticsProviderProps {
  children?: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();

  // Initialize analytics and meaningful click tracking on provider mount
  useEffect(() => {
    analytics.init();
    const cleanupClicks = initClickTracking();
    return () => {
      cleanupClicks();
    };
  }, []);

  // Track initial page view and subsequent route changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Small timeout to allow document.title / HeadContent to update if necessary
    const timer = setTimeout(() => {
      const pageTitle = document.title || "YLabs";
      const searchStr = location.search
        ? `?${new URLSearchParams(location.search as Record<string, string>).toString()}`
        : "";
      const pagePath = location.pathname + searchStr;
      const pageLocation = window.location.href;

      analytics.trackPageView({
        page_title: pageTitle,
        page_path: pagePath,
        page_location: pageLocation,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  return <>{children}</>;
}

export default AnalyticsProvider;
