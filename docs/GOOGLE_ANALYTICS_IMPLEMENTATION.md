# Google Analytics 4 (GA4) Implementation & Engineering Architecture – YLabs

This document outlines the production-ready Google Analytics 4 (GA4) architecture, configuration, privacy controls, and deployment strategy across the YLabs platform (`ylabs-web`).

---

## 1. Architecture & Environment Model

Analytics in YLabs is controlled exclusively via the master environment flag:

`VITE_ANALYTICS_ENABLED`

YLabs operates with two application environments:

1. **LOCAL**: Local development running on developer machines, local Vite dev servers, Vite preview servers, or local Docker containers. When `VITE_ANALYTICS_ENABLED=true`, analytics initializes and tracks locally to support immediate local testing. When `VITE_ANALYTICS_ENABLED=false`, analytics is disabled.
2. **DEV**: The deployed remote application environment (`dev.yuvrolabs.com`). When `VITE_ANALYTICS_ENABLED=true`, analytics is enabled.

Neither LOCAL nor DEV is automatically excluded based on hostname, IP address, loopback interface, Vite development mode, or application environment.

### Property & Stream Configuration
- **Property Count**: Exactly **ONE** GA4 property.
- **Web Data Stream**: Exactly **ONE** Web Data Stream.
- **Shared Measurement ID**: `G-K65FFJ5ZD9` is currently shared by both LOCAL and DEV environments.
- **Discarded Properties**: The non-production test property `G-EY9GFSPLQH` is obsolete and unused.

---

## 2. Directory Structure & File Map

All analytics logic is centralized inside `ylabs-web/src/services/analytics/`:

```
ylabs-web/
├── docker-entrypoint.sh           # POSIX container startup script; generates /usr/share/nginx/html/env-config.js
├── nginx.conf                     # Nginx configuration serving SPA and setting no-cache headers for env-config.js
├── index.html                     # Loads /env-config.js synchronously in <head> before React initializes
├── public/
│   └── env-config.js              # Local fallback stub preventing 404s during local Vite development & preview
├── src/
│   └── services/analytics/
│       ├── analyticsConfig.ts     # Enablement logic (VITE_ANALYTICS_ENABLED), window.__ENV__ resolution & ID validation
│       ├── analyticsEvents.ts     # Typed event catalogue, parameter schemas, URL/PII sanitizer & allowlists
│       ├── analytics.ts           # Core GA4 service: script injection, instance-aware lifecycle deduplication
│       ├── analyticsProvider.tsx  # React Context Provider integrating TanStack Router for route tracking
│       ├── useAnalytics.ts        # Ergonomic React hook for application components
│       └── index.ts               # Public module exports
└── docs/
    └── GOOGLE_ANALYTICS_IMPLEMENTATION.md
```

---

## 3. Environment Configuration & Docker Runtime Strategy

### Environment Configuration Files

#### LOCAL Environment
Configured in `ylabs-web/.env.local` and `ylabs-web/.env.development`:

```env
VITE_ANALYTICS_ENABLED=true
VITE_GA4_MEASUREMENT_ID=G-K65FFJ5ZD9
VITE_APP_ENV=local
```
- To disable analytics tracking locally, change `VITE_ANALYTICS_ENABLED=false`.

#### DEV Environment
Values are loaded into the frontend container at runtime via `docker-compose.dev.yml` using `ylabs-web/.env.dev-secrets` (overriding defaults in `ylabs-web/.env.dev`):

```env
VITE_ANALYTICS_ENABLED=true
VITE_GA4_MEASUREMENT_ID=G-K65FFJ5ZD9
VITE_APP_ENV=dev
```
- **Git Exclusion**: `.env.dev-secrets` is strictly excluded from Git tracking via `.gitignore` (`**/.env.*-secrets`).
- **Template**: Placeholders are provided in `ylabs-web/.env.dev-secrets.example` and `ylabs-web/.env.example`.
- To disable analytics tracking in DEV, change `VITE_ANALYTICS_ENABLED=false`.

### Docker Runtime Configuration ("Build Once, Run Dynamically")

In Vite SPAs, `import.meta.env` values are baked into the JavaScript bundle at build time. To allow the container image to run with dynamic runtime variables without rebuilding the bundle:

1. **Docker Container Startup**:
   When the container starts, the Docker `ENTRYPOINT ["/docker-entrypoint.sh"]` executes before Nginx starts.
2. **POSIX Shell Sanitization (`docker-entrypoint.sh`)**:
   - Validates `VITE_GA4_MEASUREMENT_ID` using regex `^G-[A-Z0-9]{4,15}$` and rejects placeholders (`G-XXXXXXXXXX`, `G-0000000000`, etc.).
   - Normalizes `VITE_ANALYTICS_ENABLED` strictly to `"true"` or `"false"`.
   - Normalizes `VITE_APP_ENV` strictly to `"dev"` or `"local"`.
   - Generates `/usr/share/nginx/html/env-config.js` with `Object.freeze`:
     ```javascript
     window.__ENV__ = Object.freeze({
       VITE_GA4_MEASUREMENT_ID: "G-K65FFJ5ZD9",
       VITE_ANALYTICS_ENABLED: "true",
       VITE_APP_ENV: "dev"
     });
     ```
   - Sets secure read permissions (`chmod 644`).
3. **Synchronous Execution Before React**:
   In `index.html`, `<script src="/env-config.js"></script>` is located in `<head>` immediately before the module entry point `<script type="module" src="/src/main.tsx"></script>`. This guarantees `window.__ENV__` is populated synchronously before any React code or analytics service executes.
4. **Nginx Cache Prevention (`nginx.conf`)**:
   ```nginx
   location = /env-config.js {
       add_header Cache-Control "no-cache, no-store, must-revalidate";
       add_header Pragma "no-cache";
       add_header Expires "0";
   }
   ```
5. **Runtime Resolution Hierarchy (`analyticsConfig.ts`)**:
   `shouldInitializeAnalytics()` resolves configuration values in this order:
   1. Explicit test overrides (if provided)
   2. `window.__ENV__` (runtime Docker injection)
   3. `import.meta.env` (Vite build-time fallbacks)

---

## 4. Enablement Decision Logic (`analyticsConfig.ts`)

Analytics initialization is evaluated strictly by `shouldInitializeAnalytics()` using the following rules:

1. **SSR / Non-Browser Safeguard**: Returns `allowed: false` if executed in a server-side rendering or headless non-browser context without window/document objects.
2. **`VITE_ANALYTICS_ENABLED` Check**:
   - Parses boolean and string values (`true`, `"true"`, `"1"`, `"yes"`, `"on"` case-insensitively).
   - If false, `"false"`, `"0"`, `"off"`, `"disabled"`, or undefined: returns `allowed: false`.
3. **Measurement ID Validation**:
   - Validates against GA4 format `^G-[A-Z0-9]{4,15}$`.
   - Rejects dummy placeholders (`G-XXXXXXXXXX`, `G-0000000000`, `G-YOUR_MEASUREMENT_ID`, `G-PLACEHOLDER`, `UA-*`).
   - If invalid or missing: returns `allowed: false`.
4. **Enablement**:
   - When `VITE_ANALYTICS_ENABLED` is true and a valid Measurement ID is configured, returns `allowed: true`.
   - No hostname guards, localhost checks, or Vite development mode restrictions apply.

### Behavior Matrix

| Environment | `VITE_ANALYTICS_ENABLED` | Measurement ID | Hostname | Analytics Initialized? | Script Injected? | Requests Sent? |
|---|---|---|---|---|---|---|
| **LOCAL** | `true` | `G-K65FFJ5ZD9` | `localhost:3000` / `127.0.0.1` | **Enabled** | **Yes (`gtag.js`)** | **Sent to G-K65FFJ5ZD9** |
| **LOCAL** | `false` | `G-K65FFJ5ZD9` | `localhost:3000` | **Disabled** | **No** | **0** |
| **DEV** | `true` | `G-K65FFJ5ZD9` | `dev.yuvrolabs.com` | **Enabled** | **Yes (`gtag.js`)** | **Sent to G-K65FFJ5ZD9** |
| **DEV** | `false` | `G-K65FFJ5ZD9` | `dev.yuvrolabs.com` | **Disabled** | **No** | **0** |
| **Any** | `true` | Missing / Empty | Any hostname | **Disabled** | **No** | **0** |
| **Any** | `true` | `G-XXXXXXXXXX` | Any hostname | **Disabled** | **No** | **0** |

---

## 5. Instance-Aware Session Event Deduplication

To solve edge cases where legitimate new attempts are suppressed within the same browser session while preventing duplicate tracking from React re-renders and page refreshes, `AnalyticsService` uses an **instance-aware deduplication architecture**:

### 1. Stable Instance Keys (Session Storage & Memory Cache)
Terminal completion events derive storage keys from stable submission, session, or attempt identifiers:

- **Lab Completion (`lab_completed`)**:
  - Key: `ga4_dedupe:lab_completed:${lab_id}:${instance_id}`
  - Instance ID: Sourced from `latestSub.id` (submission ID).
  - Outcome: A student completing Attempt 1 (`sub-1`) and later Attempt 2 (`sub-2`) of the same lab receives two distinct `lab_completed` events. Re-rendering or refreshing either attempt is blocked.
- **Vitarka AI Interview Completion (`interview_completed`)**:
  - Key: `ga4_dedupe:interview_completed:${interview_id}:${instance_id}`
  - Instance ID: Sourced from `sessionId` (active interview session ID).
  - Outcome: Clicking "Try Again" creates a new session ID and dispatches a distinct `interview_completed` event.
- **Evaluation Completion (`evaluation_completed`)**:
  - Key: `ga4_dedupe:eval_completed:${evaluation_id}`
  - Outcome: Multiple evaluations in the same session each receive a distinct completion event.
- **Static Milestone Events**:
  - `onboarding_completed`: `ga4_dedupe:onboarding_completed`
  - `password_reset`: `ga4_dedupe:password_reset_completed`

### 2. Elimination of Synthetic Fallback Signatures
Previous implementations generated synthetic keys such as `sig_${total_sections}:${duration_minutes}`. This has been removed.
When a stable instance identifier is unavailable:
- `getLifecycleStorageKey` returns `null`.
- The event is not permanently burned into `sessionStorage`, ensuring future legitimate attempts in the same session are not blocked.
- React re-renders and rapid clicks are handled by the short-term debounce cache (`dedupeKey = ${eventName}::${JSON.stringify(sanitized)}`, 1000ms window).

### 3. Absolute Privacy Boundary on Instance Keys
All instance identifiers (`instance_id`, `submission_id`, `session_id`, `attempt_id`, `evaluation_id`) are used **strictly on the client for deduplication**.
- The `EVENT_PARAM_ALLOWLIST` in `analyticsEvents.ts` excludes all instance IDs.
- `sanitizeEventParams()` strips these fields before payload dispatch.
- **Result**: Zero instance IDs, candidate IDs, or user IDs are ever sent to Google Analytics 4.

---

## 6. Privacy & Parameter Sanitization

### Banned Content & Parameters
The parameter sanitizer enforces an absolute ban on sensitive user and system data:
- **Zero PII**: No names, emails, phone numbers, or passwords.
- **Zero Assessment Content**: No candidate code submissions, SQL queries, assessment answer options, or question prompts.
- **Zero AI Transcripts**: No Vitarka AI speech transcripts, audio tokens, or LLM evaluation outputs.
- **Zero User/Candidate IDs**: Raw candidate UUIDs and user database IDs are blocked.

### URL & Route Sanitization (`sanitizeUrl`)
- **Query Parameter Redaction**: Strips `token`, `access`, `refresh`, `id_token`, `access_token`, `uidb64`, `code`, `auth`, `password`, `email`, `key`, `secret`, `state`, `e` (evaluation ID), `candidate`, `user_id`. Standard marketing parameters (`utm_source`, `utm_medium`, `tab`, `page`) are preserved.
- **Path Segment Redaction**:
  - `/shared/report/[token]` $\rightarrow$ `/shared/report/:token`
  - `/reset-password/[uidb64]/[token]` $\rightarrow$ `/reset-password/:uidb64/:token`
  - `/u/[username]` $\rightarrow$ `/u/:username`
  - `/public/milestone/[slug]/[userId]` $\rightarrow$ `/public/milestone/:slug/:userId`
  - `/admin/student-report/[userId]` $\rightarrow$ `/admin/student-report/:userId`
  - Generic UUIDs $\rightarrow$ `/:id`

---

## 7. Consent Architecture & GA4 Configuration

### Consent-Free Architecture Decision
- Per project specifications, Google Consent Mode v2 has been removed.
- In both LOCAL and DEV, when enabled, GA4 initializes dynamically without waiting for consent signals.
- **IP Anonymization**: In GA4, IP addresses are automatically dropped by Google at ingestion. The legacy Universal Analytics parameter `anonymize_ip: true` is obsolete and has been omitted from `gtag("config", ...)`.

### Recommended GA4 Custom Definitions (for Property `G-K65FFJ5ZD9`)

#### Custom Dimensions (**Admin > Custom definitions > Custom dimensions**)
| Dimension Name | Scope | Event Parameter | Description |
|---|---|---|---|
| Lab ID | Event | `lab_id` | Catalog slug of the practical lab |
| Lab Type | Event | `lab_type` | Category or domain of the lab |
| Task ID | Event | `task_id` | Ticket identifier |
| Interview Mode | Event | `interview_mode` | Mode of Vitarka AI interview (`text`, `voice`, `automatic`) |
| Report Type | Event | `report_type` | Report category (`candidate_evaluation`, `lab_report`) |
| Evaluation Type | Event | `evaluation_type` | Evaluation context |
| User Role | Event | `role` | Role of user (`student`, `recruiter`, `admin`) |

#### Custom Metrics (**Admin > Custom definitions > Custom metrics**)
| Metric Name | Scope | Event Parameter | Unit |
|---|---|---|---|
| Duration Minutes | Event | `duration_minutes` | Minutes |
| Duration Seconds | Event | `duration_seconds` | Seconds |
| Task Count | Event | `task_count` | Standard |
| Total Sections | Event | `total_sections` | Standard |

#### Key Events (Conversions)
Mark in GA4 under **Admin > Events > Key events**:
1. `sign_up`
2. `evaluation_completed`
3. `onboarding_completed`
4. `lab_completed`

---

## 8. Verification & Test Evidence

### Automated Unit Test Suite
```bash
cd ylabs-web
node --experimental-strip-types --test src/lib/__tests__/analytics.test.ts
```

Output:
```
▶ Google Analytics 4 (GA4): Configuration & Enablement Control (VITE_ANALYTICS_ENABLED)
  ✔ 1. LOCAL + VITE_ANALYTICS_ENABLED=true + valid Measurement ID -> analytics enabled (0.48ms)
  ✔ 2. DEV + VITE_ANALYTICS_ENABLED=true + valid Measurement ID -> analytics enabled (0.12ms)
  ✔ 3. LOCAL + VITE_ANALYTICS_ENABLED=false -> analytics disabled (0.05ms)
  ✔ 4. DEV + VITE_ANALYTICS_ENABLED=false -> analytics disabled (0.04ms)
  ✔ 5. Any hostname with enabled analytics and a valid ID -> analytics enabled (0.08ms)
  ✔ 6. Missing Measurement ID -> analytics disabled (0.05ms)
  ✔ 7. Invalid Measurement ID -> analytics disabled (0.06ms)
  ✔ 8. Runtime window.__ENV__ configuration works correctly in both LOCAL and DEV (0.05ms)
✔ Google Analytics 4 (GA4): Configuration & Enablement Control (VITE_ANALYTICS_ENABLED) (1.68ms)
▶ Google Analytics 4 (GA4): Privacy & Parameter Sanitization
  ✔ 1. Strips sensitive query parameters from URLs (0.48ms)
  ✔ 2. Redacts sensitive path segments (tokens, usernames, UUIDs) (0.10ms)
  ✔ 3. Detects and blocks PII values (emails, JWTs, phone numbers) (0.15ms)
  ✔ 4. Enforces event parameter allowlist and drops unpermitted properties (0.08ms)
  ✔ 5. Drops candidate/evaluation IDs to avoid linkability to individual students (0.03ms)
  ✔ 6. Blocks assessment answers and interview transcripts (0.04ms)
✔ Google Analytics 4 (GA4): Privacy & Parameter Sanitization (0.99ms)
▶ Google Analytics 4 (GA4): Core Service & Script Loading (Consent-Free Architecture)
  ✔ 1. Disabled analytics injects no script and sends no events (0.25ms)
  ✔ 2. Safely handles trackPageView and trackEvent when analytics is disabled without errors (0.06ms)
  ✔ 3. Initializes dynamically in local or remote deployment without Consent Mode v2 or obsolete anonymize_ip (2.01ms)
  ✔ 4. Deduplicates identical events and page views dispatched in rapid succession (0.16ms)
  ✔ 5. Persistent lifecycle deduplication prevents re-firing on re-renders, but allows legitimate separate instances (0.19ms)
  ✔ 6. Instruments complete YLabs journey events with correct parameter filtering (0.12ms)
✔ Google Analytics 4 (GA4): Core Service & Script Loading (Consent-Free Architecture) (2.88ms)
ℹ tests 20
ℹ suites 3
ℹ pass 20
ℹ fail 0
```

### Full Application Test Suite
```bash
cd ylabs-web
npm test
```
Result: **158 tests passed, 23 suites, 0 failures**.

### Production Build
```bash
cd ylabs-web
npm run build
```
Result: **Build succeeded in 13.39s** (`dist/` bundle compiled cleanly).

### Code Quality & Linting
```bash
cd ylabs-web
npx eslint src/services/analytics/ src/lib/__tests__/analytics.test.ts
```
Result: **0 errors, 0 warnings**.
