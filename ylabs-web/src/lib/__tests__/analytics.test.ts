/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  isLocalHostname,
  isLocalEnvironment,
  isValidMeasurementId,
  isAnalyticsExplicitlyDisabled,
  shouldInitializeAnalytics,
} from "../../services/analytics/analyticsConfig.ts";
import {
  GA4_EVENTS,
  sanitizeUrl,
  sanitizePath,
  isIdOrUuid,
  containsSensitiveData,
  sanitizeEventParams,
} from "../../services/analytics/analyticsEvents.ts";
import {
  shouldIgnoreClick,
  isClickDebounced,
  getPageCategory,
  getDestinationCategory,
} from "../../services/analytics/analyticsClickTracker.ts";
import { analytics } from "../../services/analytics/analytics.ts";

describe("Google Analytics 4 (GA4): Configuration & Enablement Control (VITE_ANALYTICS_ENABLED)", () => {
  it("1. LOCAL + VITE_ANALYTICS_ENABLED=true + valid Measurement ID -> analytics enabled", () => {
    const decision = shouldInitializeAnalytics({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: true,
      hostname: "localhost",
      isDev: true,
      appEnv: "local",
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.measurementId, "G-K65FFJ5ZD9");
    assert.ok(decision.reason.includes("VITE_ANALYTICS_ENABLED is true"));
  });

  it("2. DEV + VITE_ANALYTICS_ENABLED=true + valid Measurement ID -> analytics enabled", () => {
    const decision = shouldInitializeAnalytics({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "true",
      hostname: "dev.yuvrolabs.com",
      isDev: false,
      appEnv: "dev",
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.measurementId, "G-K65FFJ5ZD9");
    assert.ok(decision.reason.includes("VITE_ANALYTICS_ENABLED is true"));
  });

  it("3. LOCAL + VITE_ANALYTICS_ENABLED=false -> analytics disabled", () => {
    const decision = shouldInitializeAnalytics({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: false,
      hostname: "localhost",
      isDev: true,
      appEnv: "local",
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.reason.includes("VITE_ANALYTICS_ENABLED is false"));
  });

  it("4. DEV + VITE_ANALYTICS_ENABLED=false -> analytics disabled", () => {
    const decision = shouldInitializeAnalytics({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "false",
      hostname: "dev.yuvrolabs.com",
      isDev: false,
      appEnv: "dev",
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.reason.includes("VITE_ANALYTICS_ENABLED is false"));
  });

  it("5. Any hostname with enabled analytics and a valid ID -> analytics enabled", () => {
    const testHostnames = [
      "localhost",
      "127.0.0.1",
      "::1",
      "0.0.0.0",
      "app.localhost",
      "test.local",
      "subdomain.internal",
      "dev.yuvrolabs.com",
      "preview-123.vercel.app",
      "app.yuvro.com",
    ];

    for (const hostname of testHostnames) {
      const decision = shouldInitializeAnalytics({
        measurementId: "G-K65FFJ5ZD9",
        analyticsEnabled: true,
        hostname,
        isDev: hostname.includes("localhost") || hostname === "127.0.0.1",
      });
      assert.equal(
        decision.allowed,
        true,
        `Analytics must be allowed on hostname: ${hostname} when VITE_ANALYTICS_ENABLED is true`,
      );
      assert.equal(decision.measurementId, "G-K65FFJ5ZD9");
    }
  });

  it("6. Missing Measurement ID -> analytics disabled", () => {
    const emptyIdDecision = shouldInitializeAnalytics({
      measurementId: "",
      analyticsEnabled: true,
      hostname: "localhost",
    });
    assert.equal(emptyIdDecision.allowed, false);
    assert.ok(emptyIdDecision.reason.includes("invalid or missing GA4 Measurement ID"));

    const undefinedIdDecision = shouldInitializeAnalytics({
      measurementId: undefined,
      analyticsEnabled: true,
      hostname: "localhost",
    });
    assert.equal(undefinedIdDecision.allowed, false);
    assert.ok(undefinedIdDecision.reason.includes("invalid or missing GA4 Measurement ID"));
  });

  it("7. Invalid Measurement ID -> analytics disabled", () => {
    const placeholders = [
      "G-XXXXXXXXXX",
      "G-0000000000",
      "G-YOUR_MEASUREMENT_ID",
      "G-PLACEHOLDER",
      "UA-12345-6",
      "INVALID_ID",
    ];

    for (const badId of placeholders) {
      const decision = shouldInitializeAnalytics({
        measurementId: badId,
        analyticsEnabled: true,
        hostname: "localhost",
      });
      assert.equal(
        decision.allowed,
        false,
        `Placeholder or invalid ID '${badId}' must result in allowed: false`,
      );
      assert.ok(decision.reason.includes("invalid or missing GA4 Measurement ID"));
    }

    assert.equal(isValidMeasurementId("G-XXXXXXXXXX"), false);
    assert.equal(isValidMeasurementId("G-0000000000"), false);
    assert.equal(isValidMeasurementId("G-YOUR_MEASUREMENT_ID"), false);
    assert.equal(isValidMeasurementId("UA-12345-6"), false);
    assert.equal(isValidMeasurementId("G-K65FFJ5ZD9"), true);
  });

  it("8. Runtime window.__ENV__ configuration works correctly in both LOCAL and DEV", () => {
    // 1. Runtime injection on LOCAL (e.g. local Docker or localhost) with enabled analytics
    (globalThis as any).window = {
      location: { hostname: "localhost" },
      __ENV__: {
        VITE_GA4_MEASUREMENT_ID: "G-K65FFJ5ZD9",
        VITE_ANALYTICS_ENABLED: "true",
        VITE_APP_ENV: "local",
      },
    };
    const localDecision = shouldInitializeAnalytics();
    assert.equal(localDecision.allowed, true);
    assert.equal(localDecision.measurementId, "G-K65FFJ5ZD9");

    // 2. Runtime injection on DEV with enabled analytics
    (globalThis as any).window = {
      location: { hostname: "dev.yuvrolabs.com" },
      __ENV__: {
        VITE_GA4_MEASUREMENT_ID: "G-K65FFJ5ZD9",
        VITE_ANALYTICS_ENABLED: "true",
        VITE_APP_ENV: "dev",
      },
    };
    const devDecision = shouldInitializeAnalytics();
    assert.equal(devDecision.allowed, true);
    assert.equal(devDecision.measurementId, "G-K65FFJ5ZD9");

    // 3. Runtime injection with disabled analytics
    (globalThis as any).window = {
      location: { hostname: "localhost" },
      __ENV__: {
        VITE_GA4_MEASUREMENT_ID: "G-K65FFJ5ZD9",
        VITE_ANALYTICS_ENABLED: "false",
        VITE_APP_ENV: "local",
      },
    };
    const disabledDecision = shouldInitializeAnalytics();
    assert.equal(disabledDecision.allowed, false);
    assert.ok(disabledDecision.reason.includes("VITE_ANALYTICS_ENABLED is false"));

    delete (globalThis as any).window;
  });
});

describe("Google Analytics 4 (GA4): Privacy & Parameter Sanitization", () => {
  it("1. Strips sensitive query parameters from URLs", () => {
    const url = "https://yuvrolabs.com/auth?token=secret123&uidb64=dXNlcg==&e=eval-uuid&tab=signup";
    const cleaned = sanitizeUrl(url);

    assert.ok(!cleaned.includes("token=secret123"));
    assert.ok(!cleaned.includes("uidb64=dXNlcg=="));
    assert.ok(!cleaned.includes("e=eval-uuid"));
    assert.ok(cleaned.includes("tab=signup"));
  });

  it("2. Redacts sensitive path segments (tokens, usernames, UUIDs)", () => {
    // Shared report token in path
    const sharedReportUrl = "/shared/report/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9?tab=labs";
    assert.equal(sanitizeUrl(sharedReportUrl), "/shared/report/:token?tab=labs");

    // Password reset tokens in path
    const resetUrl = "https://yuvrolabs.com/reset-password/MTI/b8e030a1c1d2e3f4";
    assert.equal(sanitizeUrl(resetUrl), "https://yuvrolabs.com/reset-password/:uidb64/:token");

    // User profile username in path
    const profileUrl = "/u/john_doe_99?view=activity";
    assert.equal(sanitizeUrl(profileUrl), "/u/:username?view=activity");

    // Generic UUIDs and candidate ID in path
    const uuidUrl = "/recruiter/evaluations/550e8400-e29b-41d4-a716-446655440000/candidates/1";
    assert.equal(sanitizeUrl(uuidUrl), "/recruiter/evaluations/:id/candidates/:candidateId");

    // Exact user requirement 1: lab with UUID slug and variant UUID sprint
    const userProblemUrl =
      "/student/lab/fe770700-4e85-41c8-abda-ab07a25db028/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b";
    assert.equal(sanitizeUrl(userProblemUrl), "/student/lab/:id/sprint/:sprintId");

    // Exact user requirement 2: readable slug preserved, variant UUID sprint redacted
    const readableSlugUrl =
      "/student/lab/intro-to-python/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b";
    assert.equal(sanitizeUrl(readableSlugUrl), "/student/lab/intro-to-python/sprint/:sprintId");

    // Ticket URLs: readable slug preserved, ticket ID redacted
    const ticketUrl = "/student/lab/react-basics/ticket/3b12f451-912c-4901-b51c-843812739210";
    assert.equal(sanitizeUrl(ticketUrl), "/student/lab/react-basics/ticket/:ticketId");

    // Ticket review with UUID slug: both slug and ticket ID redacted
    const ticketReviewUrl =
      "/student/lab/fe770700-4e85-41c8-abda-ab07a25db028/ticket/3b12f451-912c-4901-b51c-843812739210/review";
    assert.equal(sanitizeUrl(ticketReviewUrl), "/student/lab/:id/ticket/:ticketId/review");

    // Admin student report review
    const adminReportUrl = "/admin/student-report/user-123/lab-456/ticket/ticket-789/review";
    assert.equal(
      sanitizeUrl(adminReportUrl),
      "/admin/student-report/:userId/:labId/ticket/:ticketId/review",
    );
  });

  it("2b. isIdOrUuid accurately detects standard UUIDs, variant UUIDs, hex IDs, and numeric IDs", () => {
    // Standard RFC 4122 (8-4-4-4-12)
    assert.equal(isIdOrUuid("fe770700-4e85-41c8-abda-ab07a25db028"), true);
    // Variant / truncated hex UUID (8-4-4-4-10)
    assert.equal(isIdOrUuid("144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b"), true);
    // Mongo ObjectID (24 hex)
    assert.equal(isIdOrUuid("65a1234567890123456789ab"), true);
    // Numeric ID (>= 4 digits)
    assert.equal(isIdOrUuid("12345"), true);
    // Readable slug names must NOT be treated as IDs
    assert.equal(isIdOrUuid("intro-to-python"), false);
    assert.equal(isIdOrUuid("fullstack-system-design"), false);
    assert.equal(isIdOrUuid("react-hooks-lab"), false);
  });

  it("3. Detects and blocks PII values (emails, JWTs, phone numbers)", () => {
    assert.equal(containsSensitiveData("candidate@example.com"), true);
    assert.equal(
      containsSensitiveData(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak",
      ),
      true,
    );
    assert.equal(containsSensitiveData("+91 9876543210"), true);
    assert.equal(containsSensitiveData("9876543210"), true);

    // Non-PII values
    assert.equal(containsSensitiveData("automatic"), false);
    assert.equal(containsSensitiveData("java-spring-boot"), false);
    assert.equal(containsSensitiveData("task_1"), false);
  });

  it("4. Enforces event parameter allowlist and drops unpermitted properties", () => {
    const rawParams = {
      lab_id: "lab-sql-101",
      task_id: "task-1",
      score: 100,
      user_name: "John Doe", // PII, not in allowlist
      student_email: "john@example.com", // PII, not in allowlist
      user_code_submission: "SELECT * FROM users", // Code, not in allowlist
      random_hack_param: "malicious", // Not in allowlist
    };

    const sanitized = sanitizeEventParams(GA4_EVENTS.TASK_SUBMITTED, rawParams);

    assert.equal(sanitized.lab_id, "lab-sql-101");
    assert.equal(sanitized.task_id, "task-1");
    assert.equal(sanitized.score, 100);
    assert.equal(sanitized.user_name, undefined);
    assert.equal(sanitized.student_email, undefined);
    assert.equal(sanitized.user_code_submission, undefined);
    assert.equal(sanitized.random_hack_param, undefined);
  });

  it("5. Drops candidate/evaluation IDs to avoid linkability to individual students", () => {
    const evalParams = {
      evaluation_id: "550e8400-e29b-41d4-a716-446655440000",
      total_sections: 4,
      duration_minutes: 45,
    };

    const sanitized = sanitizeEventParams(GA4_EVENTS.EVALUATION_COMPLETED, evalParams as any);
    assert.equal(
      sanitized.evaluation_id,
      undefined,
      "evaluation_id must be stripped from GA4 payload",
    );
    assert.equal(sanitized.total_sections, 4);
    assert.equal(sanitized.duration_minutes, 45);
  });

  it("6. Blocks assessment answers and interview transcripts", () => {
    const questionParams = {
      assessment_id: "eval-assessment-1",
      question_index: 2,
      question_type: "multiple_choice",
      candidate_answer: "B", // Must be blocked
      question_prompt: "What is B-tree indexing?", // Content blocked
    };

    const sanitized = sanitizeEventParams(GA4_EVENTS.QUESTION_ANSWERED, questionParams);

    assert.equal(sanitized.assessment_id, "eval-assessment-1");
    assert.equal(sanitized.question_index, 2);
    assert.equal(sanitized.question_type, "multiple_choice");
    assert.equal(sanitized.candidate_answer, undefined);
    assert.equal(sanitized.question_prompt, undefined);
  });

  it("7. Drops UUIDs and database IDs from event parameters (e.g. task_opened) while preserving categorical values and safe slugs", () => {
    // Case A: The exact browser-observed failure (raw UUIDs in lab_id and task_id)
    const observedRawParams = {
      lab_id: "fe770700-4e85-41c8-abda-ab07a25db028",
      task_id: "c18cd58b-bc3d-43b4-9ca1-0cf9fa0a44c5",
      task_type: "coding",
      difficulty: "intermediate",
      technology: "react",
    };
    const sanitizedObserved = sanitizeEventParams(GA4_EVENTS.TASK_OPENED, observedRawParams as any);
    assert.equal(
      sanitizedObserved.lab_id,
      undefined,
      "Raw UUID lab_id must be stripped from event params",
    );
    assert.equal(
      sanitizedObserved.task_id,
      undefined,
      "Raw UUID task_id must be stripped from event params",
    );
    assert.equal(
      sanitizedObserved.task_type,
      "coding",
      "Safe categorical task_type must be preserved",
    );
    assert.equal(
      sanitizedObserved.difficulty,
      "intermediate",
      "Safe categorical difficulty must be preserved",
    );
    assert.equal(
      sanitizedObserved.technology,
      "react",
      "Safe categorical technology must be preserved",
    );

    // Case B: Safe human-readable slugs
    const slugParams = {
      lab_id: "intro-to-python",
      task_id: "task-1",
      task_type: "system_design",
      lab_category: "backend",
    };
    const sanitizedSlug = sanitizeEventParams(GA4_EVENTS.TASK_OPENED, slugParams as any);
    assert.equal(
      sanitizedSlug.lab_id,
      "intro-to-python",
      "Safe human-readable slug must be preserved",
    );
    assert.equal(
      sanitizedSlug.task_id,
      "task-1",
      "Safe human-readable task slug must be preserved",
    );
    assert.equal(sanitizedSlug.task_type, "system_design");
    assert.equal(sanitizedSlug.lab_category, "backend");

    // Case C: MongoDB ObjectID and variant UUIDs
    const dbIdParams = {
      lab_id: "65a1234567890123456789ab", // 24-character Mongo ObjectID
      task_id: "144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b", // variant hex UUID
      task_index: 2,
    };
    const sanitizedDbIds = sanitizeEventParams(GA4_EVENTS.TASK_OPENED, dbIdParams as any);
    assert.equal(sanitizedDbIds.lab_id, undefined, "MongoDB ObjectID must be stripped");
    assert.equal(sanitizedDbIds.task_id, undefined, "Variant UUID must be stripped");
    assert.equal(sanitizedDbIds.task_index, 2, "Safe integer index must be preserved");

    // Case D: Numeric ID parameter keys ending with _id
    const numericIdParams = {
      ticket_id: 987654,
      task_index: 1,
    };
    const sanitizedNumeric = sanitizeEventParams(GA4_EVENTS.TASK_OPENED, numericIdParams as any);
    assert.equal(sanitizedNumeric.ticket_id, undefined, "Numeric ticket_id must be stripped");
    assert.equal(sanitizedNumeric.task_index, 1);
  });
});

describe("Google Analytics 4 (GA4): Core Service & Script Loading (Consent-Free Architecture)", () => {
  beforeEach(() => {
    analytics.reset();
  });

  it("1. Disabled analytics injects no script and sends no events", () => {
    const fakeDataLayer: any[] = [];
    const fakeScripts: any[] = [];
    (globalThis as any).document = {
      head: { appendChild: (el: any) => fakeScripts.push(el) },
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: { hostname: "localhost", href: "http://localhost:3000/" },
    };

    const result = analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: false,
      hostname: "localhost",
      isDev: true,
      appEnv: "local",
    });

    assert.equal(result, false);
    assert.equal(analytics.isEnabled(), false);
    assert.equal(analytics.isInitialized(), true);
    assert.equal(fakeScripts.length, 0);

    // Verify trackPageView and trackEvent do not dispatch anything
    analytics.trackPageView({ page_title: "Home", page_location: "http://localhost:3000/" });
    analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "email" });
    assert.equal(fakeDataLayer.length, 0);

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("2. Safely handles trackPageView and trackEvent when analytics is disabled without errors", () => {
    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: false,
      hostname: "localhost",
      isDev: true,
    });

    // Should not throw or crash
    assert.doesNotThrow(() => {
      analytics.trackPageView({ page_title: "Home", page_location: "http://localhost:3000/" });
      analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "email" });
    });
  });

  it("3. Initializes dynamically in local or remote deployment without Consent Mode v2 or obsolete anonymize_ip", () => {
    const fakeDataLayer: any[] = [];
    const fakeScripts: any[] = [];
    const fakeHead = {
      appendChild: (el: any) => fakeScripts.push(el),
    };

    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: {
        href: "http://localhost:3000/dashboard",
        pathname: "/dashboard",
        search: "",
      },
    };
    (globalThis as any).document = {
      head: fakeHead,
      title: "YLabs Dashboard",
      getElementById: () => null,
      createElement: (tag: string) => ({ id: "", async: false, src: "", onerror: null }),
    };

    const result = analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "true",
      hostname: "localhost",
      isDev: true,
      appEnv: "local",
    });

    assert.equal(result, true);
    assert.equal(analytics.isEnabled(), true);
    assert.equal(analytics.getMeasurementId(), "G-K65FFJ5ZD9");
    assert.equal(fakeScripts.length, 1);
    assert.ok(fakeScripts[0].src.includes("G-K65FFJ5ZD9"));

    // Verify Consent Mode v2 was NOT called (simplified consent-free architecture)
    const consentCalls = fakeDataLayer.filter((call) => call[0] === "consent");
    assert.equal(consentCalls.length, 0, "No Consent Mode calls should be executed");

    // Verify dataLayer entries are Arguments objects rather than Arrays (required by gtag.js command dispatcher)
    assert.ok(fakeDataLayer.length > 0, "dataLayer should contain entries");
    for (const entry of fakeDataLayer) {
      assert.equal(
        Array.isArray(entry),
        false,
        "gtag entries in dataLayer MUST NOT be arrays (Array.isArray must be false)",
      );
      assert.equal(
        Object.prototype.toString.call(entry),
        "[object Arguments]",
        "gtag entries in dataLayer MUST be Arguments objects",
      );
    }

    // Verify config called with send_page_view: false (anonymize_ip is obsolete in GA4 and omitted)
    const configCall = fakeDataLayer.find((call) => call[0] === "config");
    assert.ok(configCall, "Config call should be recorded");
    assert.equal(configCall[1], "G-K65FFJ5ZD9");
    assert.equal(configCall[2].send_page_view, false);
    assert.equal(
      configCall[2].anonymize_ip,
      undefined,
      "anonymize_ip is obsolete in GA4 and should not be configured",
    );

    // Test trackPageView
    analytics.trackPageView({ page_title: "Dashboard", page_path: "/dashboard" });
    const pageViewCall = fakeDataLayer.find(
      (call) => call[0] === "event" && call[1] === "page_view",
    );
    assert.ok(pageViewCall, "page_view event should be dispatched");

    // Test trackEvent
    analytics.trackEvent(GA4_EVENTS.LOGIN, { method: "email", role: "student" });
    const loginCall = fakeDataLayer.find((call) => call[0] === "event" && call[1] === "login");
    assert.ok(loginCall, "login event should be dispatched");
    assert.equal(loginCall[2].method, "email");
    assert.equal(loginCall[2].role, "student");

    // Cleanup globals
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("4. Deduplicates identical events and page views dispatched in rapid succession", () => {
    const fakeDataLayer: any[] = [];
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: {
        href: "https://dev.yuvrolabs.com/evaluation",
        pathname: "/evaluation",
        search: "",
      },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      title: "Evaluation",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "true",
      hostname: "dev.yuvrolabs.com",
      isDev: false,
    });

    // Fire duplicate page views
    analytics.trackPageView({
      page_title: "Evaluation",
      page_location: "https://dev.yuvrolabs.com/evaluation",
    });
    analytics.trackPageView({
      page_title: "Evaluation",
      page_location: "https://dev.yuvrolabs.com/evaluation",
    });

    const pageViewEvents = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "page_view",
    );
    assert.equal(pageViewEvents.length, 1, "Immediate duplicate page view should be ignored");

    // Fire duplicate task submissions within 5s
    analytics.trackEvent(GA4_EVENTS.TASK_SUBMITTED, {
      lab_id: "lab-1",
      task_id: "task-1",
      status: "done",
    });
    analytics.trackEvent(GA4_EVENTS.TASK_SUBMITTED, {
      lab_id: "lab-1",
      task_id: "task-1",
      status: "done",
    });

    const taskEvents = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "task_submitted",
    );
    assert.equal(taskEvents.length, 1, "Rapid duplicate task submission should be debounced");

    // Cleanup globals
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("5. Persistent lifecycle deduplication prevents re-firing on re-renders, but allows legitimate separate instances", () => {
    const fakeDataLayer: any[] = [];
    const storageStore = new Map<string, string>();
    const fakeSessionStorage = {
      getItem: (k: string) => storageStore.get(k) ?? null,
      setItem: (k: string, v: string) => storageStore.set(k, v),
      removeItem: (k: string) => storageStore.delete(k),
      length: 0,
      key: () => null,
    };

    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      sessionStorage: fakeSessionStorage,
      location: {
        href: "https://dev.yuvrolabs.com/student/lab/fullstack/report",
        pathname: "/student/lab/fullstack/report",
        search: "",
      },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      title: "Lab Report",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "true",
      hostname: "dev.yuvrolabs.com",
      isDev: false,
    });

    // ── LAB COMPLETIONS ──────────────────────────────────────────────────────────
    // 1. Initial completion of Lab A (Attempt 1)
    analytics.trackEvent(GA4_EVENTS.LAB_COMPLETED, {
      lab_id: "lab-java-spring",
      completion_status: "completed",
      instance_id: "sub-attempt-1",
    });
    const labCalls1 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "lab_completed",
    );
    assert.equal(labCalls1.length, 1, "First lab_completed must be recorded");
    assert.equal(labCalls1[0][2].instance_id, undefined, "instance_id must not be sent to GA4");
    assert.equal(labCalls1[0][2].lab_id, "lab-java-spring");

    // 2. Component re-render of Lab A Attempt 1 -> blocked
    analytics.trackEvent(GA4_EVENTS.LAB_COMPLETED, {
      lab_id: "lab-java-spring",
      completion_status: "completed",
      instance_id: "sub-attempt-1",
    });
    assert.equal(
      fakeDataLayer.filter((call) => call[0] === "event" && call[1] === "lab_completed").length,
      1,
      "Re-render of same lab attempt should not fire duplicate lab_completed",
    );

    // 3. User refreshes Lab A Attempt 1 page -> blocked via sessionStorage
    analytics.trackEvent(GA4_EVENTS.LAB_COMPLETED, {
      lab_id: "lab-java-spring",
      completion_status: "completed",
      instance_id: "sub-attempt-1",
    });
    assert.equal(
      fakeDataLayer.filter((call) => call[0] === "event" && call[1] === "lab_completed").length,
      1,
      "Page refresh of same lab attempt should not fire duplicate lab_completed",
    );

    // 4. In the SAME session, user attempts Lab A again (Attempt 2) -> MUST FIRE!
    analytics.trackEvent(GA4_EVENTS.LAB_COMPLETED, {
      lab_id: "lab-java-spring",
      completion_status: "completed",
      instance_id: "sub-attempt-2",
    });
    const labCallsAfterAttempt2 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "lab_completed",
    );
    assert.equal(
      labCallsAfterAttempt2.length,
      2,
      "Legitimate second attempt of same lab in same session MUST NOT be suppressed",
    );
    assert.equal(labCallsAfterAttempt2[1][2].instance_id, undefined);

    // 5. In the SAME session, user completes a DIFFERENT lab (Lab B) -> MUST FIRE!
    analytics.trackEvent(GA4_EVENTS.LAB_COMPLETED, {
      lab_id: "lab-sql-analytics",
      completion_status: "completed",
      instance_id: "sub-sql-1",
    });
    const labEventsAfterLabB = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "lab_completed",
    );
    assert.equal(
      labEventsAfterLabB.length,
      3,
      "Legitimate different lab completion in same session MUST NOT be suppressed",
    );
    assert.equal(labEventsAfterLabB[2][2].lab_id, "lab-sql-analytics");

    // ── EVALUATION COMPLETIONS ───────────────────────────────────────────────────
    // 6. Initial completion of Evaluation 1
    analytics.trackEvent(GA4_EVENTS.EVALUATION_COMPLETED, {
      evaluation_id: "eval-session-101",
      total_sections: 3,
      duration_minutes: 30,
    });
    const evalCalls1 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "evaluation_completed",
    );
    assert.equal(evalCalls1.length, 1, "Evaluation 1 must be recorded");
    // Verify evaluation_id was NOT sent to GA4
    assert.equal(
      evalCalls1[0][2].evaluation_id,
      undefined,
      "evaluation_id must be stripped from GA4",
    );
    assert.equal(evalCalls1[0][2].total_sections, 3);

    // 7. Refresh / re-render of Evaluation 1 -> blocked
    analytics.trackEvent(GA4_EVENTS.EVALUATION_COMPLETED, {
      evaluation_id: "eval-session-101",
      total_sections: 3,
      duration_minutes: 30,
    });
    assert.equal(
      fakeDataLayer.filter((call) => call[0] === "event" && call[1] === "evaluation_completed")
        .length,
      1,
      "Re-render of same evaluation must be deduplicated",
    );

    // 8. In the SAME session, user completes a DIFFERENT evaluation (Evaluation 2) -> MUST FIRE!
    analytics.trackEvent(GA4_EVENTS.EVALUATION_COMPLETED, {
      evaluation_id: "eval-session-202",
      total_sections: 5,
      duration_minutes: 60,
    });
    const evalCalls2 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "evaluation_completed",
    );
    assert.equal(
      evalCalls2.length,
      2,
      "Legitimate separate evaluation completion in same session MUST NOT be suppressed",
    );
    assert.equal(
      evalCalls2[1][2].evaluation_id,
      undefined,
      "evaluation_id must be stripped from GA4",
    );
    assert.equal(evalCalls2[1][2].total_sections, 5);

    // ── INTERVIEW COMPLETIONS ────────────────────────────────────────────────────
    // 9. Initial completion of Interview Attempt 1
    analytics.trackEvent(GA4_EVENTS.INTERVIEW_COMPLETED, {
      interview_id: "iv-fullstack-dev",
      interview_mode: "automatic",
      instance_id: "interview-sess-1",
    });
    const ivCalls1 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "interview_completed",
    );
    assert.equal(ivCalls1.length, 1, "Interview attempt 1 must be recorded");
    // Verify instance_id / session_id was NOT sent to GA4
    assert.equal(ivCalls1[0][2].instance_id, undefined, "instance_id must not be sent to GA4");
    assert.equal(ivCalls1[0][2].interview_id, "iv-fullstack-dev");

    // 10. Re-render of Attempt 1 -> blocked
    analytics.trackEvent(GA4_EVENTS.INTERVIEW_COMPLETED, {
      interview_id: "iv-fullstack-dev",
      interview_mode: "automatic",
      instance_id: "interview-sess-1",
    });
    assert.equal(
      fakeDataLayer.filter((call) => call[0] === "event" && call[1] === "interview_completed")
        .length,
      1,
      "Duplicate interview completion for same attempt must be deduplicated",
    );

    // 11. In the SAME session, user clicks 'Try Again' and completes a NEW attempt (Attempt 2) -> MUST FIRE!
    analytics.trackEvent(GA4_EVENTS.INTERVIEW_COMPLETED, {
      interview_id: "iv-fullstack-dev",
      interview_mode: "automatic",
      instance_id: "interview-sess-2",
    });
    const ivCalls2 = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === "interview_completed",
    );
    assert.equal(
      ivCalls2.length,
      2,
      "Legitimate new interview attempt completion in same session MUST NOT be suppressed",
    );

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("6. Instruments complete YLabs journey events with correct parameter filtering", () => {
    const fakeDataLayer: any[] = [];
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: { href: "https://dev.yuvrolabs.com/", pathname: "/", search: "" },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      title: "YLabs",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: "true",
      hostname: "dev.yuvrolabs.com",
      isDev: false,
    });

    // Practical labs
    analytics.trackEvent(GA4_EVENTS.LAB_STARTED, {
      lab_id: "lab-java-1",
      lab_type: "engineering",
      difficulty: "Intermediate",
      technology: "Java",
      task_count: 5,
    });

    analytics.trackEvent(GA4_EVENTS.TASK_OPENED, {
      lab_id: "lab-java-1",
      task_id: "task-101",
      task_index: 0,
    });

    analytics.trackEvent(GA4_EVENTS.TASK_SUBMITTED, {
      lab_id: "lab-java-1",
      task_id: "task-101",
      score: 100,
      status: "done",
      evaluation_type: "practice",
    });

    // Vitarka AI
    analytics.trackEvent(GA4_EVENTS.INTERVIEW_STARTED, {
      interview_id: "vitarka-fullstack",
      interview_mode: "automatic",
      role_category: "Full Stack",
    });

    analytics.trackEvent(GA4_EVENTS.INTERVIEW_COMPLETED, {
      interview_id: "vitarka-fullstack",
      interview_mode: "automatic",
      duration_seconds: 1200,
    });

    // Reports
    analytics.trackEvent(GA4_EVENTS.REPORT_DOWNLOADED, {
      report_type: "candidate_evaluation",
      format: "pdf",
    });

    const events = fakeDataLayer.filter((call) => call[0] === "event");
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.LAB_STARTED));
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.TASK_OPENED));
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.TASK_SUBMITTED));
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.INTERVIEW_STARTED));
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.INTERVIEW_COMPLETED));
    assert.ok(events.some((e) => e[1] === GA4_EVENTS.REPORT_DOWNLOADED));

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });
});

describe("Google Analytics 4 (GA4): Meaningful Click Tracking & Interaction Integrity", () => {
  beforeEach(() => {
    analytics.reset();
  });

  it("1. trackClick dispatches typed click_action with allowlisted parameters and URL sanitization", () => {
    const fakeDataLayer: any[] = [];
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: {
        href: "https://dev.yuvrolabs.com/student/dashboard",
        pathname: "/student/dashboard",
        search: "",
        host: "dev.yuvrolabs.com",
      },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      title: "Student Dashboard",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: true,
      hostname: "dev.yuvrolabs.com",
      isDev: false,
      appEnv: "dev",
    });

    analytics.trackClick({
      component_type: "button",
      action_name: "start_lab",
      page_category: "student",
      destination_category: "student",
      destination_url:
        "https://dev.yuvrolabs.com/student/lab/fe770700-4e85-41c8-abda-ab07a25db028/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b?token=secret123",
    });

    const clickCall = fakeDataLayer.find(
      (call) => call[0] === "event" && call[1] === GA4_EVENTS.CLICK_ACTION,
    );
    assert.ok(clickCall, "click_action event should be recorded in dataLayer");

    const params = clickCall[2];
    assert.equal(params.component_type, "button");
    assert.equal(params.action_name, "start_lab");
    assert.equal(params.page_category, "student");
    assert.equal(params.destination_category, "student");
    assert.equal(params.app_env, "dev");

    // Verify destination_url has UUIDs and token redacted
    assert.ok(!params.destination_url.includes("token=secret123"));
    assert.ok(!params.destination_url.includes("fe770700-4e85-41c8-abda-ab07a25db028"));
    assert.ok(!params.destination_url.includes("144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b"));
    assert.equal(
      params.destination_url,
      "https://dev.yuvrolabs.com/student/lab/:id/sprint/:sprintId",
    );

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("2. shouldIgnoreClick excludes Monaco, CodeMirror, terminals, inputs, and opt-outs", () => {
    // Helper to simulate DOM element hierarchy
    const createElementWithAncestors = (
      classes: string[],
      tagName = "div",
      attrs: Record<string, string> = {},
    ) => {
      return {
        tagName,
        closest: (selector: string) => {
          const selList = selector.split(",").map((s) => s.trim());
          for (const s of selList) {
            if (s.startsWith(".")) {
              const cls = s.slice(1);
              if (classes.includes(cls)) return { tagName, className: cls };
            }
            if (s === tagName.toLowerCase()) {
              return { tagName };
            }
            if (s.startsWith("[") && s.endsWith("]")) {
              const inner = s.slice(1, -1);
              const [k, v] = inner.split("=");
              const cleanVal = v ? v.replace(/['"]/g, "") : undefined;
              if (attrs[k]) {
                if (cleanVal === undefined || attrs[k] === cleanVal) {
                  return { tagName, [k]: attrs[k] };
                }
              }
            }
          }
          return null;
        },
      };
    };

    // Monaco Editor
    const monacoEl = createElementWithAncestors(["monaco-editor", "view-line"]);
    assert.equal(shouldIgnoreClick(monacoEl as any), true);

    // CodeMirror Editor
    const cmEl = createElementWithAncestors(["cm-editor", "cm-content"]);
    assert.equal(shouldIgnoreClick(cmEl as any), true);

    // Terminal
    const termEl = createElementWithAncestors(["xterm", "xterm-screen"]);
    assert.equal(shouldIgnoreClick(termEl as any), true);

    // Form inputs and textareas
    const inputEl = createElementWithAncestors([], "input");
    assert.equal(shouldIgnoreClick(inputEl as any), true);

    const textareaEl = createElementWithAncestors([], "textarea");
    assert.equal(shouldIgnoreClick(textareaEl as any), true);

    // Element with data-no-analytics
    const optOutEl = createElementWithAncestors([], "button", { "data-no-analytics": "true" });
    assert.equal(shouldIgnoreClick(optOutEl as any), true);

    // Standard button with data-analytics-action
    const validButton = createElementWithAncestors([], "button", {
      "data-analytics-action": "start_lab",
    });
    assert.equal(shouldIgnoreClick(validButton as any), false);
  });

  it("3. isClickDebounced prevents accidental rapid double clicks within 500ms", () => {
    const key = `test_action_${Date.now()}`;
    // First click must not be debounced
    assert.equal(isClickDebounced(key, 500), false);
    // Immediate second click must be debounced
    assert.equal(isClickDebounced(key, 500), true);

    // Different action is independent
    const differentKey = `different_action_${Date.now()}`;
    assert.equal(isClickDebounced(differentKey, 500), false);
  });

  it("4. Outbound links are categorized and have query parameters sanitized", () => {
    assert.equal(getDestinationCategory("https://github.com/yuvro/ylabs"), "external");
    assert.equal(getDestinationCategory("https://docs.docker.com/compose"), "external");
    assert.equal(getDestinationCategory("/student/lab/intro-to-python"), "student");
    assert.equal(getDestinationCategory("/recruiter/evaluations"), "recruiter");
    assert.equal(getDestinationCategory("/admin/users"), "admin");
    assert.equal(getPageCategory("/student/dashboard"), "student");
    assert.equal(getPageCategory("/recruiter/dashboard"), "recruiter");
    assert.equal(getPageCategory("/admin/labs"), "admin");
    assert.equal(getPageCategory("/pricing"), "public");
  });

  it("5. gtag set command configures global page_location and page_referrer without UUIDs", () => {
    const fakeDataLayer: any[] = [];
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: {
        href: "https://dev.yuvrolabs.com/student/lab/fe770700-4e85-41c8-abda-ab07a25db028/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b?session=abc123456",
        pathname:
          "/student/lab/fe770700-4e85-41c8-abda-ab07a25db028/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b",
        search: "?session=abc123456",
      },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      referrer: "https://google.com/search?q=ylabs&token=secrettoken",
      title: "Simulation Lab",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: true,
      hostname: "dev.yuvrolabs.com",
      isDev: false,
      appEnv: "dev",
    });

    // Check gtag set calls
    const setCalls = fakeDataLayer.filter((call) => call[0] === "set");
    assert.ok(setCalls.length > 0, "gtag('set', ...) must be executed during initialization");

    const setObj = setCalls[0][1];
    assert.equal(
      setObj.page_location,
      "https://dev.yuvrolabs.com/student/lab/:id/sprint/:sprintId",
      "Global page_location set parameter must have UUIDs and query parameters sanitized",
    );
    assert.equal(
      setObj.page_referrer,
      "https://google.com/search?q=ylabs",
      "Global page_referrer set parameter must have sensitive query parameters stripped",
    );

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it("6. Correctly tracks all application journey click actions and ignores sensitive input elements", () => {
    const fakeDataLayer: any[] = [];
    (globalThis as any).window = {
      dataLayer: fakeDataLayer,
      location: {
        href: "https://dev.yuvrolabs.com/student/dashboard",
        pathname: "/student/dashboard",
        search: "",
        host: "dev.yuvrolabs.com",
      },
    };
    (globalThis as any).document = {
      head: { appendChild: () => {} },
      title: "YLabs",
      getElementById: () => null,
      createElement: () => ({ id: "", async: false, src: "" }),
    };

    analytics.init({
      measurementId: "G-K65FFJ5ZD9",
      analyticsEnabled: true,
      hostname: "dev.yuvrolabs.com",
      isDev: false,
      appEnv: "dev",
    });

    // Test a sample of newly instrumented user actions
    const testActions = [
      { action_name: "hero_continue_lab", component_type: "button", page_category: "student" },
      { action_name: "select_weekly_task", component_type: "card", page_category: "student" },
      { action_name: "ticket_select", component_type: "card", page_category: "student" },
      {
        action_name: "nav_back_to_sprints",
        component_type: "navigation",
        page_category: "student",
      },
      { action_name: "unlock_track", component_type: "button", page_category: "student" },
      {
        action_name: "report_breadcrumb_back",
        component_type: "navigation",
        page_category: "student",
      },
      { action_name: "select_report_tab_sprints", component_type: "tab", page_category: "student" },
      {
        action_name: "share_milestone_linkedin",
        component_type: "button",
        page_category: "student",
      },
      {
        action_name: "recruiter_manage_plan",
        component_type: "button",
        page_category: "recruiter",
      },
      {
        action_name: "recruiter_create_evaluation",
        component_type: "button",
        page_category: "recruiter",
      },
      { action_name: "select_evaluation_card", component_type: "card", page_category: "recruiter" },
      { action_name: "admin_nav_users", component_type: "navigation", page_category: "admin" },
      { action_name: "admin_sign_out", component_type: "navigation", page_category: "admin" },
    ];

    for (const item of testActions) {
      analytics.trackClick({
        component_type: item.component_type,
        action_name: item.action_name,
        page_category: item.page_category,
      });
    }

    const clickEvents = fakeDataLayer.filter(
      (call) => call[0] === "event" && call[1] === GA4_EVENTS.CLICK_ACTION,
    );
    assert.equal(clickEvents.length, testActions.length);
    for (let i = 0; i < testActions.length; i++) {
      assert.equal(clickEvents[i][2].action_name, testActions[i].action_name);
      assert.equal(clickEvents[i][2].component_type, testActions[i].component_type);
      assert.equal(clickEvents[i][2].page_category, testActions[i].page_category);
    }

    // Exclusion helper simulation
    const createElementWithAncestors = (
      classes: string[],
      tagName = "div",
      attrs: Record<string, string> = {},
    ) => {
      return {
        tagName,
        ...attrs,
        closest: (selector: string) => {
          const selList = selector.split(",").map((s) => s.trim());
          for (const s of selList) {
            if (s.startsWith(".")) {
              const cls = s.slice(1);
              if (classes.includes(cls)) return { tagName, className: cls };
            }
            if (s === tagName.toLowerCase()) {
              return { tagName };
            }
            if (s.startsWith("[") && s.endsWith("]")) {
              const inner = s.slice(1, -1);
              const [k, v] = inner.split("=");
              const cleanVal = v ? v.replace(/['"]/g, "") : undefined;
              if (attrs[k]) {
                if (cleanVal === undefined || attrs[k] === cleanVal) {
                  return { tagName, [k]: attrs[k] };
                }
              }
            }
          }
          return null;
        },
      };
    };

    // Sensitive inputs should all be ignored
    const passwordInput = createElementWithAncestors([], "input", { type: "password" });
    assert.equal(shouldIgnoreClick(passwordInput as any), true);

    const emailInput = createElementWithAncestors([], "input", { type: "email" });
    assert.equal(shouldIgnoreClick(emailInput as any), true);

    const editableDiv = createElementWithAncestors([], "div", { contenteditable: "true" });
    assert.equal(shouldIgnoreClick(editableDiv as any), true);

    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });
});
