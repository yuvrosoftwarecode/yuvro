/**
 * Google Analytics 4 (GA4) Event Names, Typed Parameter Definitions, and Privacy Filter.
 *
 * Implements strict parameter allowlisting to ensure zero transmission of PII,
 * student code, assessment answers, or sensitive credentials.
 */

export const GA4_EVENTS = {
  // Authentication
  SIGN_UP: "sign_up",
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_RESET: "password_reset",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Navigation
  PAGE_VIEW: "page_view",
  DASHBOARD_VIEWED: "dashboard_viewed",
  LAB_VIEWED: "lab_viewed",
  ASSESSMENT_VIEWED: "assessment_viewed",
  INTERVIEW_VIEWED: "interview_viewed",
  REPORT_VIEWED: "report_viewed",

  // Practical Labs
  LAB_STARTED: "lab_started",
  TASK_OPENED: "task_opened",
  TASK_SUBMITTED: "task_submitted",
  LAB_COMPLETED: "lab_completed",

  // Knowledge Assessments
  ASSESSMENT_STARTED: "assessment_started",
  QUESTION_ANSWERED: "question_answered",
  ASSESSMENT_SUBMITTED: "assessment_submitted",
  ASSESSMENT_COMPLETED: "assessment_completed",

  // Vitarka AI
  INTERVIEW_STARTED: "interview_started",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW_CANCELLED: "interview_cancelled",
  INTERVIEW_REPORT_VIEWED: "interview_report_viewed",

  // Evaluation & Reports
  EVALUATION_COMPLETED: "evaluation_completed",
  REPORT_DOWNLOADED: "report_downloaded",

  // Meaningful Click Tracking
  CLICK_ACTION: "click_action",
  NAVIGATION_CLICKED: "navigation_clicked",
  DASHBOARD_ACTION_CLICKED: "dashboard_action_clicked",
  LAB_CARD_CLICKED: "lab_card_clicked",
  LAB_START_CLICKED: "lab_start_clicked",
  TICKET_CLICKED: "ticket_clicked",
  TICKET_ACTION_CLICKED: "ticket_action_clicked",
  ASSESSMENT_ACTION_CLICKED: "assessment_action_clicked",
  INTERVIEW_ACTION_CLICKED: "interview_action_clicked",
  REPORT_DOWNLOAD_CLICKED: "report_download_clicked",
  OUTBOUND_CLICK: "outbound_click",
} as const;

export type GA4EventName = (typeof GA4_EVENTS)[keyof typeof GA4_EVENTS];

export interface PageViewParams {
  page_title: string;
  page_location: string;
  page_path: string;
  page_referrer?: string;
}

export interface SignUpParams {
  method: "email" | "google" | "recruiter";
  role?: string;
}

export interface LoginParams {
  method: "email" | "google" | "recruiter";
  role?: string;
}

export type LogoutParams = Record<string, never>;

export interface PasswordResetParams {
  step: "requested" | "completed";
}

export interface OnboardingCompletedParams {
  user_type?: string;
}

export interface DashboardViewedParams {
  dashboard_type: "student" | "recruiter" | "admin";
}

export interface LabViewedParams {
  lab_id?: string;
  lab_title?: string;
  lab_category?: string;
  category?: string;
  difficulty?: string;
  technology?: string;
}

export interface AssessmentViewedParams {
  assessment_id?: string;
  assessment_title?: string;
}

export interface InterviewViewedParams {
  interview_id?: string;
  interview_mode?: "automatic" | "hybrid" | "custom";
}

export interface ReportViewedParams {
  report_type: "evaluation" | "lab" | "interview" | "candidate";
  lab_id?: string;
}

export interface LabStartedParams {
  lab_id?: string;
  lab_type?: string;
  lab_category?: string;
  difficulty?: string;
  technology?: string;
  task_count?: number;
}

export interface TaskOpenedParams {
  lab_id?: string;
  task_id?: string;
  task_index?: number;
  lab_category?: string;
  task_type?: string;
  difficulty?: string;
}

export interface TaskSubmittedParams {
  lab_id?: string;
  task_id?: string;
  task_index?: number;
  score?: number;
  status?: string;
  evaluation_type?: string;
  lab_category?: string;
  task_type?: string;
  difficulty?: string;
}

export interface LabCompletedParams {
  lab_id?: string;
  completion_status: string;
  score?: number;
  elapsed_time_seconds?: number;
  lab_category?: string;
  difficulty?: string;
  instance_id?: string;
  submission_id?: string;
}

export interface AssessmentStartedParams {
  assessment_id: string;
  question_count?: number;
  duration_minutes?: number;
}

export interface QuestionAnsweredParams {
  assessment_id: string;
  question_index?: number;
  question_type?: string;
}

export interface AssessmentSubmittedParams {
  assessment_id: string;
  answered_count?: number;
  total_questions?: number;
}

export interface AssessmentCompletedParams {
  assessment_id: string;
  score?: number;
  total_possible_score?: number;
}

export interface InterviewStartedParams {
  interview_id: string;
  interview_mode: "automatic" | "hybrid" | "custom";
  role_category?: string;
}

export interface InterviewCompletedParams {
  interview_id: string;
  interview_mode: "automatic" | "hybrid" | "custom";
  duration_seconds?: number;
  instance_id?: string;
  session_id?: string;
  attempt_id?: string;
}

export interface InterviewCancelledParams {
  interview_id: string;
  interview_mode: "automatic" | "hybrid" | "custom";
  reason?: string;
}

export interface InterviewReportViewedParams {
  interview_id: string;
  interview_mode?: "automatic" | "hybrid" | "custom";
}

export interface EvaluationCompletedParams {
  evaluation_id?: string;
  instance_id?: string;
  total_sections?: number;
  duration_minutes?: number;
  evaluation_type?: string;
}

export interface ReportDownloadedParams {
  report_type: string;
  report_id?: string;
  format: "pdf";
}

export interface ClickActionParams {
  component_type: "button" | "link" | "card" | "tab" | "navigation";
  action_name: string;
  page_category?: "student" | "recruiter" | "admin" | "public";
  destination_category?: "student" | "recruiter" | "admin" | "external";
  app_env?: string;
  destination_url?: string;
}

export type GA4EventParamsMap = {
  [GA4_EVENTS.PAGE_VIEW]: PageViewParams;
  [GA4_EVENTS.SIGN_UP]: SignUpParams;
  [GA4_EVENTS.LOGIN]: LoginParams;
  [GA4_EVENTS.LOGOUT]: LogoutParams;
  [GA4_EVENTS.PASSWORD_RESET]: PasswordResetParams;
  [GA4_EVENTS.ONBOARDING_COMPLETED]: OnboardingCompletedParams;
  [GA4_EVENTS.DASHBOARD_VIEWED]: DashboardViewedParams;
  [GA4_EVENTS.LAB_VIEWED]: LabViewedParams;
  [GA4_EVENTS.ASSESSMENT_VIEWED]: AssessmentViewedParams;
  [GA4_EVENTS.INTERVIEW_VIEWED]: InterviewViewedParams;
  [GA4_EVENTS.REPORT_VIEWED]: ReportViewedParams;
  [GA4_EVENTS.LAB_STARTED]: LabStartedParams;
  [GA4_EVENTS.TASK_OPENED]: TaskOpenedParams;
  [GA4_EVENTS.TASK_SUBMITTED]: TaskSubmittedParams;
  [GA4_EVENTS.LAB_COMPLETED]: LabCompletedParams;
  [GA4_EVENTS.ASSESSMENT_STARTED]: AssessmentStartedParams;
  [GA4_EVENTS.QUESTION_ANSWERED]: QuestionAnsweredParams;
  [GA4_EVENTS.ASSESSMENT_SUBMITTED]: AssessmentSubmittedParams;
  [GA4_EVENTS.ASSESSMENT_COMPLETED]: AssessmentCompletedParams;
  [GA4_EVENTS.INTERVIEW_STARTED]: InterviewStartedParams;
  [GA4_EVENTS.INTERVIEW_COMPLETED]: InterviewCompletedParams;
  [GA4_EVENTS.INTERVIEW_CANCELLED]: InterviewCancelledParams;
  [GA4_EVENTS.INTERVIEW_REPORT_VIEWED]: InterviewReportViewedParams;
  [GA4_EVENTS.EVALUATION_COMPLETED]: EvaluationCompletedParams;
  [GA4_EVENTS.REPORT_DOWNLOADED]: ReportDownloadedParams;
  [GA4_EVENTS.CLICK_ACTION]: ClickActionParams;
  [GA4_EVENTS.NAVIGATION_CLICKED]: ClickActionParams;
  [GA4_EVENTS.DASHBOARD_ACTION_CLICKED]: ClickActionParams;
  [GA4_EVENTS.LAB_CARD_CLICKED]: ClickActionParams;
  [GA4_EVENTS.LAB_START_CLICKED]: ClickActionParams;
  [GA4_EVENTS.TICKET_CLICKED]: ClickActionParams;
  [GA4_EVENTS.TICKET_ACTION_CLICKED]: ClickActionParams;
  [GA4_EVENTS.ASSESSMENT_ACTION_CLICKED]: ClickActionParams;
  [GA4_EVENTS.INTERVIEW_ACTION_CLICKED]: ClickActionParams;
  [GA4_EVENTS.REPORT_DOWNLOAD_CLICKED]: ClickActionParams;
  [GA4_EVENTS.OUTBOUND_CLICK]: ClickActionParams;
};

const CLICK_EVENT_PARAMS = [
  "component_type",
  "action_name",
  "page_category",
  "destination_category",
  "app_env",
  "destination_url",
] as const;

/**
 * Explicit Parameter Allowlist per event name.
 * Any property key not present here will be omitted before forwarding to Google Analytics.
 * Individual student/candidate IDs, evaluation UUIDs, and report UUIDs are excluded to prevent linkability.
 */
export const EVENT_PARAM_ALLOWLIST: Record<string, readonly string[]> = {
  [GA4_EVENTS.PAGE_VIEW]: ["page_title", "page_location", "page_path", "page_referrer"],
  [GA4_EVENTS.SIGN_UP]: ["method", "role"],
  [GA4_EVENTS.LOGIN]: ["method", "role"],
  [GA4_EVENTS.LOGOUT]: [],
  [GA4_EVENTS.PASSWORD_RESET]: ["step"],
  [GA4_EVENTS.ONBOARDING_COMPLETED]: ["user_type"],
  [GA4_EVENTS.DASHBOARD_VIEWED]: ["dashboard_type"],
  [GA4_EVENTS.LAB_VIEWED]: [
    "lab_id",
    "lab_title",
    "lab_category",
    "category",
    "difficulty",
    "technology",
  ],
  [GA4_EVENTS.ASSESSMENT_VIEWED]: ["assessment_id", "assessment_title"],
  [GA4_EVENTS.INTERVIEW_VIEWED]: ["interview_id", "interview_mode"],
  [GA4_EVENTS.REPORT_VIEWED]: ["report_type", "lab_id"],
  [GA4_EVENTS.LAB_STARTED]: [
    "lab_id",
    "lab_type",
    "lab_category",
    "difficulty",
    "technology",
    "task_count",
  ],
  [GA4_EVENTS.TASK_OPENED]: [
    "lab_id",
    "task_id",
    "task_index",
    "lab_category",
    "task_type",
    "difficulty",
    "technology",
  ],
  [GA4_EVENTS.TASK_SUBMITTED]: [
    "lab_id",
    "task_id",
    "task_index",
    "score",
    "status",
    "evaluation_type",
    "lab_category",
    "task_type",
    "difficulty",
  ],
  [GA4_EVENTS.LAB_COMPLETED]: [
    "lab_id",
    "completion_status",
    "score",
    "elapsed_time_seconds",
    "lab_category",
    "difficulty",
  ],
  [GA4_EVENTS.ASSESSMENT_STARTED]: ["assessment_id", "question_count", "duration_minutes"],
  [GA4_EVENTS.QUESTION_ANSWERED]: ["assessment_id", "question_index", "question_type"],
  [GA4_EVENTS.ASSESSMENT_SUBMITTED]: ["assessment_id", "answered_count", "total_questions"],
  [GA4_EVENTS.ASSESSMENT_COMPLETED]: ["assessment_id", "score", "total_possible_score"],
  [GA4_EVENTS.INTERVIEW_STARTED]: ["interview_id", "interview_mode", "role_category"],
  [GA4_EVENTS.INTERVIEW_COMPLETED]: ["interview_id", "interview_mode", "duration_seconds"],
  [GA4_EVENTS.INTERVIEW_CANCELLED]: ["interview_id", "interview_mode", "reason"],
  [GA4_EVENTS.INTERVIEW_REPORT_VIEWED]: ["interview_id", "interview_mode"],
  [GA4_EVENTS.EVALUATION_COMPLETED]: ["total_sections", "duration_minutes", "evaluation_type"],
  [GA4_EVENTS.REPORT_DOWNLOADED]: ["report_type", "format"],
  [GA4_EVENTS.CLICK_ACTION]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.NAVIGATION_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.DASHBOARD_ACTION_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.LAB_CARD_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.LAB_START_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.TICKET_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.TICKET_ACTION_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.ASSESSMENT_ACTION_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.INTERVIEW_ACTION_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.REPORT_DOWNLOAD_CLICKED]: CLICK_EVENT_PARAMS,
  [GA4_EVENTS.OUTBOUND_CLICK]: CLICK_EVENT_PARAMS,
};

/**
 * Denylist of sensitive field names. If any key contains these substrings,
 * it is stripped immediately regardless of any other settings.
 */
const SENSITIVE_KEY_SUBSTRINGS = [
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "user_id",
  "userid",
  "candidate_id",
  "candidateid",
  "student_id",
  "studentid",
  "evaluation_id",
  "evaluationid",
  "submission_id",
  "submissionid",
  "attempt_id",
  "attemptid",
  "session_id",
  "sessionid",
  "report_id",
  "reportid",
  "ticket_id",
  "ticketid",
  "transcript",
  "prompt",
  "response",
  "code",
  "solution",
  "sql",
  "answer",
  "token",
  "password",
  "secret",
  "key",
  "auth",
  "bearer",
  "jwt",
  "credential",
  "cookie",
  "ssn",
  "card",
];

const SENSITIVE_URL_PARAMS = new Set([
  "token",
  "access",
  "refresh",
  "id_token",
  "access_token",
  "uidb64",
  "code",
  "auth",
  "password",
  "email",
  "key",
  "secret",
  "state",
  "code_challenge",
  "session",
  "session_id",
  "e",
  "candidate",
  "candidate_id",
  "candidateid",
  "student",
  "student_id",
  "studentid",
  "user",
  "user_id",
  "userid",
  "eval_id",
  "evaluation_id",
  "submission_id",
  "report_id",
  "attempt_id",
  "instance_id",
  "phone",
  "first_name",
  "last_name",
]);

/**
 * Detects whether a path segment or parameter represents an ID or UUID.
 * Matches:
 * - Standard RFC 4122 UUIDs: 8-4-4-4-12 hex characters
 * - Variant / truncated UUIDs: e.g. 8-4-4-4-10 (like 144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b)
 * - Raw hex identifiers: 20 to 36 hex characters (MongoDB ObjectIds, hashes)
 * - Standalone numeric IDs: 4 or more digits
 */
export function isIdOrUuid(segment: string): boolean {
  if (!segment || typeof segment !== "string") return false;
  const s = segment.trim();

  // 1. Hyphenated UUIDs (standard 8-4-4-4-12 or variants 8-4-4-4-8..16)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{8,16}$/.test(s)) {
    return true;
  }

  // 2. 20-36 hex characters (MongoDB ObjectID is 24 hex, unhyphenated UUID is 32 hex)
  if (/^[0-9a-fA-F]{20,36}$/.test(s)) {
    return true;
  }

  // 3. Numeric ID (4 or more digits)
  if (/^\d{4,}$/.test(s)) {
    return true;
  }

  return false;
}

/**
 * Sanitizes URL pathnames to prevent exposing shared tokens, reset tokens,
 * personal usernames, or entity UUIDs in page views and paths.
 * Preserves clean route structures while redacting sensitive IDs.
 */
export function sanitizePath(pathname: string): string {
  if (!pathname || typeof pathname !== "string") return "";
  let p = pathname;

  // 1. Shared report token: /shared/report/<token> -> /shared/report/:token
  p = p.replace(/\/shared\/report\/[^/?#]+/g, "/shared/report/:token");

  // 2. Reset password tokens: /reset-password/<uidb64>/<token> -> /reset-password/:uidb64/:token
  p = p.replace(/\/reset-password\/[^/?#]+\/[^/?#]+/g, "/reset-password/:uidb64/:token");

  // 3. Public user profile username: /u/<username> -> /u/:username
  p = p.replace(/\/u\/[^/?#]+/g, "/u/:username");

  // 4. Milestone user id: /public/milestone/<slug>/<userId> -> /public/milestone/<slug>/:userId
  p = p.replace(/\/public\/milestone\/([^/?#]+)\/[^/?#]+/g, "/public/milestone/$1/:userId");

  // 5. Admin student report: /admin/student-report/<userId>/<labId>/ticket/<ticketId>/review
  p = p.replace(
    /\/admin\/student-report\/[^/?#]+\/[^/?#]+\/ticket\/[^/?#]+\/review/g,
    "/admin/student-report/:userId/:labId/ticket/:ticketId/review",
  );

  // 6. Admin student report: /admin/student-report/<userId>/<labId>
  p = p.replace(
    /\/admin\/student-report\/[^/?#]+\/[^/?#]+/g,
    "/admin/student-report/:userId/:labId",
  );

  // 7. Admin users lab report: /admin/users/<id>/labs/<slug>/report
  p = p.replace(
    /\/admin\/users\/[^/?#]+\/labs\/([^/?#]+)\/report/g,
    (_match, slug) => `/admin/users/:id/labs/${isIdOrUuid(slug) ? ":slug" : slug}/report`,
  );

  // 8. Admin users: /admin/users/<id>
  p = p.replace(/\/admin\/users\/[^/?#]+/g, "/admin/users/:id");

  // 9. Admin labs: /admin/labs/<id>/sprints/<sprintId>
  p = p.replace(/\/admin\/labs\/[^/?#]+\/sprints?\/[^/?#]+/g, "/admin/labs/:id/sprints/:sprintId");

  // 10. Admin labs subroutes: /admin/labs/<id>/(analytics|edit|sprints)
  p = p.replace(/\/admin\/labs\/[^/?#]+\/(analytics|edit|sprints)/g, "/admin/labs/:id/$1");

  // 11. Admin mock interviews / weekly tasks edit:
  p = p.replace(/\/admin\/mock-interviews\/[^/?#]+\/edit/g, "/admin/mock-interviews/:id/edit");
  p = p.replace(/\/admin\/weekly-tasks\/[^/?#]+\/edit/g, "/admin/weekly-tasks/:id/edit");

  // 12. Student lab sprint: /student/lab/<slug>/sprint(s)/<sprintId>
  // Handles: /student/lab/fe770700-4e85-41c8-abda-ab07a25db028/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b -> /student/lab/:id/sprint/:sprintId
  // Handles: /student/lab/intro-to-python/sprint/144e2cd7-2ff8-4db8-bfa9-b9abaa6e4b -> /student/lab/intro-to-python/sprint/:sprintId
  p = p.replace(/\/student\/lab\/([^/?#]+)\/sprints?\/([^/?#]+)/g, (_match, slug) => {
    const cleanSlug = isIdOrUuid(slug) ? ":id" : slug;
    return `/student/lab/${cleanSlug}/sprint/:sprintId`;
  });

  // 13. Student lab ticket review: /student/lab/<slug>/ticket/<ticketId>/review
  p = p.replace(/\/student\/lab\/([^/?#]+)\/ticket\/([^/?#]+)\/review/g, (_match, slug) => {
    const cleanSlug = isIdOrUuid(slug) ? ":id" : slug;
    return `/student/lab/${cleanSlug}/ticket/:ticketId/review`;
  });

  // 14. Student lab ticket: /student/lab/<slug>/ticket/<ticketId>
  p = p.replace(/\/student\/lab\/([^/?#]+)\/ticket\/([^/?#]+)/g, (_match, slug) => {
    const cleanSlug = isIdOrUuid(slug) ? ":id" : slug;
    return `/student/lab/${cleanSlug}/ticket/:ticketId`;
  });

  // 15. Student lab report: /student/lab/<slug>/report
  p = p.replace(/\/student\/lab\/([^/?#]+)\/report/g, (_match, slug) => {
    const cleanSlug = isIdOrUuid(slug) ? ":id" : slug;
    return `/student/lab/${cleanSlug}/report`;
  });

  // 16. Student lab details: /student/lab/<slug>
  p = p.replace(/\/student\/lab\/([^/?#]+)(?=[/?#]|$)/g, (_match, slug) => {
    const cleanSlug = isIdOrUuid(slug) ? ":id" : slug;
    return `/student/lab/${cleanSlug}`;
  });

  // 17. Student collaboration routes:
  p = p.replace(
    /\/student\/collaboration\/sprint\/[^/?#]+\/report\/(individual|team)/g,
    "/student/collaboration/sprint/:id/report/$1",
  );
  p = p.replace(
    /\/student\/collaboration\/sprint\/[^/?#]+\/ticket\/[^/?#]+/g,
    "/student/collaboration/sprint/:id/ticket/:ticketId",
  );
  p = p.replace(
    /\/student\/collaboration\/sprint\/[^/?#]+\/workspace/g,
    "/student/collaboration/sprint/:id/workspace",
  );
  p = p.replace(/\/student\/collaboration\/sprint\/[^/?#]+/g, "/student/collaboration/sprint/:id");

  // 18. Recruiter evaluations routes:
  p = p.replace(
    /\/recruiter\/evaluations\/[^/?#]+\/candidates\/[^/?#]+/g,
    "/recruiter/evaluations/:id/candidates/:candidateId",
  );
  p = p.replace(
    /\/recruiter\/evaluations\/[^/?#]+\/workspace/g,
    "/recruiter/evaluations/:id/workspace",
  );
  p = p.replace(/\/recruiter\/evaluations\/[^/?#]+(?=[/?#]|$)/g, "/recruiter/evaluations/:id");

  // 19. Mock interview slug: /mock-interview/<slug>
  p = p.replace(/\/mock-interview\/([^/?#]+)(?=[/?#]|$)/g, (_match, slug) => {
    return isIdOrUuid(slug) ? "/mock-interview/:slug" : `/mock-interview/${slug}`;
  });

  // 20. Generic UUIDs (standard 8-4-4-4-12 and variant 8-4-4-4-8..16) in any remaining path segment
  p = p.replace(
    /\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{8,16}(?=[/?#]|$)/g,
    "/:id",
  );

  // 21. Raw 20-36 hex characters (MongoDB ObjectIds, unhyphenated UUIDs, hashes) in any path segment
  p = p.replace(/\/[0-9a-fA-F]{20,36}(?=[/?#]|$)/g, "/:id");

  // 22. Standalone numeric IDs (4+ digits) in path segments
  p = p.replace(/\/\d{4,}(?=[/?#]|$)/g, "/:id");

  return p;
}

/**
 * Strips sensitive path segments and query-string parameters from URLs before tracking.
 */
export function sanitizeUrl(urlStr: string): string {
  if (!urlStr || typeof urlStr !== "string") return "";

  try {
    const isRelative = urlStr.startsWith("/") || urlStr.startsWith("#") || urlStr.startsWith("?");
    const parsed = new URL(urlStr, "https://yuvrolabs.com");

    // Sanitize URL pathname
    parsed.pathname = sanitizePath(parsed.pathname);

    // Remove sensitive query parameters
    for (const [param, val] of Array.from(parsed.searchParams.entries())) {
      const lower = param.toLowerCase();
      if (
        SENSITIVE_URL_PARAMS.has(lower) ||
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("auth") ||
        lower.includes("key") ||
        lower.includes("password") ||
        lower.includes("session") ||
        containsSensitiveData(val) ||
        isIdOrUuid(val)
      ) {
        parsed.searchParams.delete(param);
      }
    }

    if (isRelative) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, remove query string entirely for safety
    return sanitizePath(urlStr.split("?")[0]);
  }
}

/**
 * Checks whether a given string value appears to contain PII or secrets (e.g., email, JWT).
 */
export function containsSensitiveData(val: string): boolean {
  if (!val || typeof val !== "string") return false;

  // Email check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
    return true;
  }

  // JWT / Bearer token check
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(val.trim())) {
    return true;
  }

  // Phone number pattern (e.g. +91 9876543210 or 10-14 consecutive digits)
  if (/^\+?[0-9\s-]{10,18}$/.test(val.trim()) && val.replace(/\D/g, "").length >= 10) {
    return true;
  }

  return false;
}

/**
 * Sanitizes event parameters against the event-specific allowlist and global PII checks.
 */
export function sanitizeEventParams(
  eventName: string,
  params?: Record<string, unknown>,
): Record<string, unknown> {
  if (!params || typeof params !== "object") {
    return {};
  }

  const allowlist = EVENT_PARAM_ALLOWLIST[eventName];
  const allowedKeys = new Set(allowlist || []);
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    // 1. Must be in event allowlist
    if (!allowedKeys.has(key)) {
      continue;
    }

    // 2. Key must not match sensitive key patterns
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEY_SUBSTRINGS.some((s) => lowerKey === s || lowerKey.includes(s))) {
      // Allowed exceptions: question_type, report_type, action_name, component_type
      if (
        key !== "question_type" &&
        key !== "report_type" &&
        key !== "action_name" &&
        key !== "component_type"
      ) {
        continue;
      }
    }

    // 3. Null / undefined omitted
    if (value === null || value === undefined) {
      continue;
    }

    // 4. Sanitize values
    if (typeof value === "string") {
      const trimmed = value.trim();

      // Check for PII or secrets (email, JWT, phone number)
      if (containsSensitiveData(trimmed)) {
        continue;
      }

      // Check for UUIDs, MongoDB IDs, or database entity identifiers
      // Never send UUIDs or database IDs in any custom event parameter (lab_id, task_id, etc.)
      if (isIdOrUuid(trimmed)) {
        continue;
      }

      // If URL property, sanitize query string and path
      if (key === "page_location" || key === "page_referrer" || key === "destination_url") {
        sanitized[key] = sanitizeUrl(trimmed);
      } else {
        // Truncate overly long values
        sanitized[key] = trimmed.length > 200 ? trimmed.substring(0, 200) : trimmed;
      }
    } else if (typeof value === "number") {
      // If the parameter key represents an ID and the numeric value is an entity ID, omit it
      if (key.endsWith("_id") || key === "id") {
        continue;
      }
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
