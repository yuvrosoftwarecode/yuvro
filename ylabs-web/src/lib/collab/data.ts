// Mock data + types for Collaboration Hub.
// Everything lives in memory; the store layer mutates copies of these.

export type Domain = "Finance" | "Healthcare" | "E-Commerce" | "Education" | "Logistics" | "AI & ML";
export type RoleKey = "Backend" | "Frontend" | "QA" | "DevOps" | "SQL" | "Mobile";
export type SprintStatus = "Open" | "In Progress" | "Completed";
export type TicketStatus = "Not Started" | "In Progress" | "Completed";
export type PRStatus = "Pending Review" | "Changes Requested" | "Approved" | "Merged";
export type MemberStatus = "joined" | "ai" | "open" | "inactive" | "removed";

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string; // initials
  level: number;
  title: string;
  points: number;
  sprintsCompleted: number;
  roles: RoleKey[];
  online: boolean;
}

export interface SprintMember {
  userId: string | null; // null when AI or open
  role: RoleKey;
  status: MemberStatus;
}

export interface Ticket {
  id: string;
  sprintId: string;
  title: string;
  role: RoleKey;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  status: TicketStatus;
  dependsOnTicketId?: string;
  description: string;
  acceptance: string[];
  refs: { label: string; url: string }[];
  starter: string;
  language: string;
  tests: { name: string; input: string; expected: string }[];
  commits: { msg: string; at: string; authorId: string }[];
  prId?: string;
  assigneeId: string | null;
}

export interface PR {
  id: string;
  ticketId: string;
  sprintId: string;
  authorId: string;
  title: string;
  description: string;
  status: PRStatus;
  diff: { type: "add" | "del" | "ctx"; text: string; line: number }[];
  comments: { id: string; line: number; authorId: string; text: string; replies: { authorId: string; text: string }[] }[];
  overallFeedback?: string;
  commits: { msg: string; at: string }[];
  raisedAt: string;
}

export interface ChatMsg {
  id: string;
  sprintId: string;
  authorId: string;
  text: string;
  at: string;
  isAI?: boolean;
}

export interface ForumReply {
  id: string;
  authorId: string;
  text: string;
  at: string;
  upvotes: number;
}

export interface ForumThread {
  id: string;
  sprintId?: string;
  title: string;
  body: string;
  tag: "Question" | "Discussion" | "Help" | "Tip";
  authorId: string;
  upvotes: number;
  at: string;
  replies: ForumReply[];
}

export interface Sprint {
  id: string;
  title: string;
  domain: Domain;
  description: string;
  durationDays: number;
  status: SprintStatus;
  requiredRoles: RoleKey[];
  members: SprintMember[];
  objectives: string[];
  dependencies: { role: RoleKey; dependsOn: RoleKey | "—"; unlocks: string }[];
  startedAt?: number; // epoch ms
  deadlineAt?: number;
  submittedAt?: number;
  meId?: string; // role-key the current user joined as
  aiAutoFill?: boolean;
}

export interface Team {
  id: string;
  sprintId: string;
  name: string;
  status: "Recruiting" | "Full" | "Active";
  ownerId: string;
  memberIds: string[];           // accepted members
  invites: { userId: string; role: RoleKey; status: "pending" | "accepted" | "declined" }[];
  openRoles: { role: RoleKey; note?: string }[];   // public role requests
  createdAt: number;
}

export interface Squad {
  id: string;
  name: string;
  ownerId: string;
  visibility: "Public" | "Invite Only";
  memberIds: string[];
  pendingIds: string[];
}

export interface Notification {
  id: string;
  type: "sprint-invite" | "role-request" | "sprint-started" | "dep-resolved" | "pr-review" | "pr-approved" | "pr-changes" | "inactivity" | "removed" | "sprint-submitted" | "report-ready" | "connection" | "squad-invite" | "level";
  message: string;
  at: number;
  read: boolean;
  link?: string;
}

// ---------- seed ----------
export const ME_ID = "u-me";
const now = Date.now();
const days = (d: number) => d * 24 * 60 * 60 * 1000;
const hours = (h: number) => h * 60 * 60 * 1000;

export const seedUsers: User[] = [
  { id: ME_ID, name: "Alex Chen", username: "alexc", avatar: "AC", level: 12, title: "Apprentice", points: 4250, sprintsCompleted: 6, roles: ["Backend", "Frontend"], online: true },
  { id: "u-priya", name: "Priya M.", username: "priyam", avatar: "PM", level: 18, title: "Engineer II", points: 11820, sprintsCompleted: 22, roles: ["Backend", "DevOps"], online: true },
  { id: "u-liam", name: "Liam K.", username: "liamk", avatar: "LK", level: 16, title: "Engineer I", points: 10990, sprintsCompleted: 18, roles: ["Frontend"], online: true },
  { id: "u-sofia", name: "Sofia R.", username: "sofiar", avatar: "SR", level: 15, title: "Engineer I", points: 9870, sprintsCompleted: 16, roles: ["SQL", "Backend"], online: false },
  { id: "u-noah", name: "Noah T.", username: "noaht", avatar: "NT", level: 14, title: "Engineer I", points: 9410, sprintsCompleted: 14, roles: ["QA"], online: true },
  { id: "u-rohith", name: "Rohith K.", username: "rohithk", avatar: "RK", level: 13, title: "Apprentice", points: 7820, sprintsCompleted: 11, roles: ["Frontend", "Mobile"], online: true },
  { id: "u-anjali", name: "Anjali R.", username: "anjalir", avatar: "AR", level: 17, title: "Engineer II", points: 12340, sprintsCompleted: 24, roles: ["Backend", "QA"], online: false },
  { id: "u-meera", name: "Meera S.", username: "meeras", avatar: "MS", level: 11, title: "Apprentice", points: 5210, sprintsCompleted: 8, roles: ["QA", "Frontend"], online: true },
  { id: "u-dev", name: "Dev P.", username: "devp", avatar: "DP", level: 19, title: "Engineer II", points: 13980, sprintsCompleted: 28, roles: ["DevOps"], online: true },
  { id: "u-kavya", name: "Kavya N.", username: "kavyan", avatar: "KN", level: 10, title: "Apprentice", points: 4920, sprintsCompleted: 7, roles: ["SQL"], online: false },
  { id: "u-arjun", name: "Arjun V.", username: "arjunv", avatar: "AV", level: 9, title: "Apprentice", points: 4180, sprintsCompleted: 6, roles: ["Backend"], online: true },
];

export const AI_ID = "u-ai";
export const aiUser: User = { id: AI_ID, name: "AI Member", username: "ai", avatar: "AI", level: 0, title: "AI", points: 0, sprintsCompleted: 0, roles: ["Backend", "Frontend", "QA", "DevOps", "SQL"], online: true };

const mkTickets = (sprintId: string): Ticket[] => [
  {
    id: `${sprintId}-S01`, sprintId, title: "Define database schema", role: "SQL", difficulty: "Medium", points: 25, status: "Completed", assigneeId: "u-sofia",
    description: "## Goal\nDesign and ship the relational schema powering this sprint.\n\nInclude users, orders, products and audit columns.",
    acceptance: ["Tables created with FKs", "Indexes on hot columns", "Migration committed"],
    refs: [{ label: "Schema guide", url: "#" }],
    starter: "-- create your tables here\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT UNIQUE NOT NULL\n);",
    language: "sql",
    tests: [{ name: "schema:users", input: "DESCRIBE users", expected: "id, email" }],
    commits: [{ msg: "init schema", at: "2d ago", authorId: "u-sofia" }, { msg: "add indexes", at: "1d ago", authorId: "u-sofia" }],
  },
  {
    id: `${sprintId}-B01`, sprintId, title: "Auth API — login & refresh", role: "Backend", difficulty: "Hard", points: 40, status: "In Progress", dependsOnTicketId: `${sprintId}-S01`, assigneeId: ME_ID,
    description: "## Build\nImplement `/auth/login` and `/auth/refresh`. JWT, httpOnly refresh cookies, rate limiting.",
    acceptance: ["POST /auth/login returns access + refresh", "Refresh rotation", "429 on brute-force"],
    refs: [{ label: "JWT best practices", url: "#" }],
    starter: "// auth.ts\nexport async function login(email: string, password: string) {\n  // TODO\n}",
    language: "typescript",
    tests: [
      { name: "login ok", input: "valid creds", expected: "200 + tokens" },
      { name: "login fail", input: "bad creds", expected: "401" },
    ],
    commits: [{ msg: "scaffold auth route", at: "6h ago", authorId: ME_ID }],
  },
  {
    id: `${sprintId}-B02`, sprintId, title: "Payments API — checkout", role: "Backend", difficulty: "Hard", points: 40, status: "In Progress", dependsOnTicketId: `${sprintId}-S01`, assigneeId: "u-priya",
    description: "Implement checkout endpoint with idempotency keys.",
    acceptance: ["Idempotent", "Webhook handler", "Order persisted"],
    refs: [], starter: "// payments\n", language: "typescript", tests: [],
    commits: [{ msg: "checkout draft", at: "3h ago", authorId: "u-priya" }],
  },
  {
    id: `${sprintId}-F01`, sprintId, title: "Login screen", role: "Frontend", difficulty: "Medium", points: 25, status: "Not Started", dependsOnTicketId: `${sprintId}-B01`, assigneeId: "u-liam",
    description: "Build the login UI matching the design.", acceptance: ["Form validation", "Loading state", "Error messages"], refs: [],
    starter: "// LoginForm.tsx\n", language: "tsx", tests: [], commits: [],
  },
  {
    id: `${sprintId}-F02`, sprintId, title: "Checkout screen", role: "Frontend", difficulty: "Hard", points: 35, status: "Not Started", dependsOnTicketId: `${sprintId}-B02`, assigneeId: "u-rohith",
    description: "Checkout flow with summary and payment.", acceptance: ["3DS handling", "Error recovery"], refs: [],
    starter: "// Checkout.tsx\n", language: "tsx", tests: [], commits: [],
  },
  {
    id: `${sprintId}-Q01`, sprintId, title: "E2E auth + checkout suite", role: "QA", difficulty: "Medium", points: 25, status: "Not Started", dependsOnTicketId: `${sprintId}-F02`, assigneeId: "u-noah",
    description: "Run Playwright E2E for both flows.", acceptance: ["All green on CI"], refs: [],
    starter: "// e2e.spec.ts\n", language: "typescript", tests: [], commits: [],
  },
  {
    id: `${sprintId}-D01`, sprintId, title: "Pipeline + deploy to staging", role: "DevOps", difficulty: "Medium", points: 20, status: "Not Started", dependsOnTicketId: `${sprintId}-Q01`, assigneeId: "u-dev",
    description: "Wire CI/CD, deploy to staging on green.", acceptance: ["Auto-deploy on merge", "Rollback documented"], refs: [],
    starter: "# .github/workflows/deploy.yml\n", language: "yaml", tests: [], commits: [],
  },
];

const mkPRs = (sprintId: string): PR[] => [
  {
    id: `${sprintId}-pr-1`, ticketId: `${sprintId}-S01`, sprintId, authorId: "u-sofia", title: "feat(db): user + order schema", description: "Adds initial schema.",
    status: "Merged",
    diff: [
      { type: "ctx", text: "-- schema.sql", line: 1 },
      { type: "add", text: "CREATE TABLE users (", line: 2 },
      { type: "add", text: "  id UUID PRIMARY KEY,", line: 3 },
      { type: "add", text: "  email TEXT UNIQUE NOT NULL", line: 4 },
      { type: "add", text: ");", line: 5 },
    ],
    comments: [], commits: [{ msg: "init schema", at: "2d ago" }, { msg: "add indexes", at: "1d ago" }], raisedAt: "2d ago",
  },
  {
    id: `${sprintId}-pr-2`, ticketId: `${sprintId}-B02`, sprintId, authorId: "u-priya", title: "feat(payments): checkout endpoint", description: "Adds /checkout with idempotency.",
    status: "Changes Requested",
    diff: [
      { type: "ctx", text: "// payments.ts", line: 1 },
      { type: "add", text: "export async function checkout(cart, key) {", line: 2 },
      { type: "add", text: "  // TODO: validate idempotency key", line: 3 },
      { type: "del", text: "  return charge(cart);", line: 4 },
      { type: "add", text: "  return idem(key, () => charge(cart));", line: 5 },
      { type: "add", text: "}", line: 6 },
    ],
    comments: [
      { id: "c1", line: 3, authorId: "u-anjali", text: "Add a test for replay attacks.", replies: [{ authorId: "u-priya", text: "On it — pushing in a sec." }] },
    ],
    overallFeedback: "Looks good — please add the replay test before merging.",
    commits: [{ msg: "checkout draft", at: "3h ago" }], raisedAt: "3h ago",
  },
  {
    id: `${sprintId}-pr-3`, ticketId: `${sprintId}-B01`, sprintId, authorId: ME_ID, title: "feat(auth): login + refresh", description: "JWT + refresh rotation.",
    status: "Pending Review",
    diff: [
      { type: "ctx", text: "// auth.ts", line: 1 },
      { type: "add", text: "export async function login(email, password) {", line: 2 },
      { type: "add", text: "  const user = await db.users.findByEmail(email);", line: 3 },
      { type: "add", text: "  if (!user || !verify(password, user.pwHash)) throw new Unauthorized();", line: 4 },
      { type: "add", text: "  return issueTokens(user);", line: 5 },
      { type: "add", text: "}", line: 6 },
    ],
    comments: [], commits: [{ msg: "scaffold auth route", at: "6h ago" }], raisedAt: "6h ago",
  },
];

const mkMessages = (sprintId: string): ChatMsg[] => [
  { id: "m1", sprintId, authorId: "u-sofia", text: "Schema is up — Backend, you're unblocked 🚀", at: "2d" },
  { id: "m2", sprintId, authorId: ME_ID, text: "Awesome, picking up #B01 now.", at: "2d" },
  { id: "m3", sprintId, authorId: AI_ID, text: "✅ I've completed ticket S02 — User Tables schema is ready. Backend tickets are now unlocked.", at: "2d", isAI: true },
  { id: "m4", sprintId, authorId: "u-priya", text: "Starting on checkout. @Alex Chen heads up on shared auth types.", at: "1d" },
  { id: "m5", sprintId, authorId: ME_ID, text: "Pushed scaffold — see #B01. PR coming after tests.", at: "8h" },
  { id: "m6", sprintId, authorId: "u-anjali", text: "Reviewed #pr-2 — left a comment about replay attacks.", at: "3h" },
  { id: "m7", sprintId, authorId: "u-priya", text: "Got it, pushing a fix.", at: "3h" },
  { id: "m8", sprintId, authorId: "u-noah", text: "QA, standing by. Will start as soon as F01 lands.", at: "2h" },
  { id: "m9", sprintId, authorId: "u-dev", text: "Pipeline scaffold ready. Auto-deploy on green to staging.", at: "1h" },
  { id: "m10", sprintId, authorId: AI_ID, text: "⚠ Dependency reminder: F01 is waiting on B01. Current ETA 2h.", at: "30m", isAI: true },
];

const mkForum = (sprintId: string): ForumThread[] => [
  { id: "t1", sprintId, title: "How are you handling refresh token rotation?", body: "Curious what others do for storage — httpOnly cookie or db row?", tag: "Question", authorId: ME_ID, upvotes: 8, at: "2d", replies: [
    { id: "r1", authorId: "u-anjali", text: "httpOnly cookie + db row for revocation list.", at: "1d", upvotes: 5 },
    { id: "r2", authorId: "u-priya", text: "Same. Rotate on every refresh.", at: "1d", upvotes: 3 },
  ]},
  { id: "t2", sprintId, title: "Tip: idempotency keys for payments", body: "Use a hash of (userId, cartId, nonce). Don't trust client-only keys.", tag: "Tip", authorId: "u-priya", upvotes: 14, at: "1d", replies: [] },
  { id: "t3", sprintId, title: "Stuck on Playwright auth helper", body: "How do you reuse logged-in state across tests?", tag: "Help", authorId: "u-noah", upvotes: 4, at: "8h", replies: [
    { id: "r3", authorId: "u-meera", text: "Save storageState after a one-time login and reuse.", at: "6h", upvotes: 2 },
  ]},
  { id: "t4", sprintId, title: "Discussion: monorepo for this stack?", body: "Worth pulling FE+BE into one repo?", tag: "Discussion", authorId: "u-rohith", upvotes: 6, at: "4h", replies: [] },
  { id: "t5", sprintId, title: "QA sign-off checklist?", body: "Sharing the one we use.", tag: "Tip", authorId: "u-noah", upvotes: 9, at: "1h", replies: [] },
];

const mkSprint = (overrides: Partial<Sprint> & Pick<Sprint, "id" | "title" | "domain" | "status">): Sprint => {
  const base = {
    description: "Ship an end-to-end production-style feature with a real cross-functional team. Each role owns their tickets and dependencies are real.",
    durationDays: 3,
    requiredRoles: ["SQL", "Backend", "Frontend", "QA", "DevOps"] as RoleKey[],
    members: [
      { userId: "u-sofia", role: "SQL", status: "joined" },
      { userId: ME_ID, role: "Backend", status: "joined" },
      { userId: "u-priya", role: "Backend", status: "joined" },
      { userId: "u-liam", role: "Frontend", status: "joined" },
      { userId: "u-rohith", role: "Frontend", status: "inactive" },
      { userId: "u-noah", role: "QA", status: "joined" },
      { userId: "u-dev", role: "DevOps", status: "joined" },
    ] as SprintMember[],
    objectives: [
      "Ship login + checkout flows end-to-end",
      "All PRs reviewed within sprint window",
      "QA sign-off + staging deploy before deadline",
    ],
    dependencies: [
      { role: "Backend" as RoleKey, dependsOn: "SQL" as RoleKey, unlocks: "User Tables schema merged" },
      { role: "Frontend" as RoleKey, dependsOn: "Backend" as RoleKey, unlocks: "API tickets merged" },
      { role: "QA" as RoleKey, dependsOn: "Frontend" as RoleKey, unlocks: "All dev tickets merged" },
      { role: "DevOps" as RoleKey, dependsOn: "QA" as RoleKey, unlocks: "QA sign-off merged" },
    ],
    startedAt: now - hours(28) as number | undefined,
    deadlineAt: now + hours(44) as number | undefined,
    submittedAt: undefined as number | undefined,
    aiAutoFill: true,
    ...overrides,
  };
  if (overrides.status === "Open") {
    base.startedAt = undefined;
    base.deadlineAt = undefined;
    base.members = base.members.map((m, i) => i < 3 ? m : { ...m, userId: null, status: "open" as MemberStatus });
  }
  if (overrides.status === "Completed") {
    base.startedAt = now - days(5);
    base.deadlineAt = now - days(2);
    base.submittedAt = now - days(2) - hours(3);
  }
  return base as Sprint;
};

export const seedSprints: Sprint[] = [
  mkSprint({ id: "sp-1", title: "FinPay — Auth + Checkout", domain: "Finance", status: "In Progress", meId: "Backend" }),
  mkSprint({ id: "sp-2", title: "MediCare Patient Portal", domain: "Healthcare", status: "In Progress", meId: "Backend",
    deadlineAt: now + hours(8) }),
  mkSprint({ id: "sp-3", title: "ShopSphere Inventory Service", domain: "E-Commerce", status: "In Progress", meId: "Backend" }),
  mkSprint({ id: "sp-4", title: "EduTrack Grade Pipeline", domain: "Education", status: "Open" }),
  mkSprint({ id: "sp-5", title: "RouteIQ Logistics Optimizer", domain: "Logistics", status: "Open" }),
  mkSprint({ id: "sp-6", title: "MoodLens Sentiment Engine", domain: "AI & ML", status: "Open" }),
  mkSprint({ id: "sp-7", title: "FinScore Credit API", domain: "Finance", status: "Open" }),
  mkSprint({ id: "sp-8", title: "HealthSync Wearable Sync", domain: "Healthcare", status: "Open" }),
  mkSprint({ id: "sp-9", title: "CartLift Recommendations", domain: "E-Commerce", status: "Open" }),
  mkSprint({ id: "sp-10", title: "ClassConnect Live Lessons", domain: "Education", status: "Open" }),
  mkSprint({ id: "sp-11", title: "FleetPulse Telemetry", domain: "Logistics", status: "Open" }),
  mkSprint({ id: "sp-12", title: "VisionTag Image Labeler", domain: "AI & ML", status: "In Progress" }),
  mkSprint({ id: "sp-13", title: "LoanFlow Origination", domain: "Finance", status: "Completed" }),
];

// pre-bake per-sprint sub-data into a map
export const seedTickets: Record<string, Ticket[]> = Object.fromEntries(seedSprints.map(s => [s.id, mkTickets(s.id)]));
export const seedPRs: Record<string, PR[]> = Object.fromEntries(seedSprints.map(s => [s.id, mkPRs(s.id)]));
export const seedMessages: Record<string, ChatMsg[]> = Object.fromEntries(seedSprints.map(s => [s.id, mkMessages(s.id)]));
export const seedForum: Record<string, ForumThread[]> = Object.fromEntries(seedSprints.map(s => [s.id, mkForum(s.id)]));

// my completed tickets in sp-1 so the board has all 3 statuses
seedTickets["sp-1"][0].status = "Completed";
seedTickets["sp-1"][1].status = "In Progress";
seedTickets["sp-1"][2].status = "In Progress";

export const seedSquads: Squad[] = [
  { id: "sq-1", name: "Night Owls", ownerId: ME_ID, visibility: "Invite Only", memberIds: [ME_ID, "u-priya", "u-liam", "u-noah", "u-dev"], pendingIds: ["u-meera"] },
  { id: "sq-2", name: "Build Faster", ownerId: "u-anjali", visibility: "Public", memberIds: [ME_ID, "u-anjali", "u-sofia", "u-rohith"], pendingIds: [] },
];

export const seedConnections: string[] = ["u-priya", "u-liam", "u-sofia", "u-noah", "u-rohith", "u-anjali", "u-meera", "u-dev"];

export const seedPendingIncoming: string[] = ["u-kavya", "u-arjun"];

export const seedTeams: Team[] = [
  { id: "tm-1", sprintId: "sp-4", name: "Pipeline Pirates", status: "Recruiting", ownerId: "u-anjali", memberIds: ["u-anjali", "u-sofia"], invites: [{ userId: "u-noah", role: "QA", status: "pending" }], openRoles: [{ role: "Frontend", note: "Need someone for grade dashboard UI" }, { role: "DevOps" }], createdAt: now - hours(5) },
  { id: "tm-2", sprintId: "sp-5", name: "Route Wizards", status: "Recruiting", ownerId: "u-priya", memberIds: ["u-priya"], invites: [], openRoles: [{ role: "Frontend" }, { role: "SQL" }, { role: "QA" }, { role: "DevOps" }], createdAt: now - hours(12) },
];

export const seedNotifications: Notification[] = [
  { id: "n1", type: "pr-changes", message: "Anjali R. requested changes on your PR for #B02.", at: now - hours(2), read: false, link: "/collaboration/sprint/sp-1/workspace?tab=pr" },
  { id: "n2", type: "dep-resolved", message: "Your ticket Auth API — login & refresh is now unlocked.", at: now - hours(3), read: false, link: "/collaboration/sprint/sp-1/ticket/sp-1-B01" },
  { id: "n3", type: "sprint-invite", message: "Anjali R. invited you to join FinScore Credit API as Backend.", at: now - hours(8), read: true, link: "/collaboration/sprint/sp-7" },
  { id: "n4", type: "connection", message: "Kavya N. wants to connect with you.", at: now - hours(20), read: true, link: "/collaboration/connections" },
  { id: "n5", type: "level", message: "🎉 You've reached Level 12 — Apprentice!", at: now - days(2), read: true, link: "/profile" },
];

// individual sprint report
export const myReport = {
  sprintId: "sp-13", role: "Backend" as RoleKey, basePoints: 180, bonus: 20, onTime: true,
  metrics: [
    { name: "Problem Solving", score: 88, summary: "Strong execution across all tickets", tip: "Try tackling one Hard ticket alone next sprint." },
    { name: "Debugging", score: 76, summary: "Caught most issues during review", tip: "Add logs earlier in the dev loop." },
    { name: "Code Quality", score: 82, summary: "Readable, well-tested PRs", tip: "Extract shared utilities to reduce duplication." },
    { name: "Code Review", score: 74, summary: "Helpful and timely reviews", tip: "Leave at least one concrete suggestion per review." },
    { name: "Team Collaboration", score: 91, summary: "Highly responsive in chat and reviews", tip: "Keep mentoring juniors — it shows." },
  ],
};

export const teamReport = {
  sprintId: "sp-13", onTime: true,
  contributions: [
    { userId: ME_ID, role: "Backend" as RoleKey, ticketsDone: 4, prsRaised: 4, prsReviewed: 3, activityScore: 92, pct: 26 },
    { userId: "u-priya", role: "Backend" as RoleKey, ticketsDone: 3, prsRaised: 3, prsReviewed: 5, activityScore: 88, pct: 22 },
    { userId: "u-sofia", role: "SQL" as RoleKey, ticketsDone: 2, prsRaised: 2, prsReviewed: 2, activityScore: 80, pct: 14 },
    { userId: "u-liam", role: "Frontend" as RoleKey, ticketsDone: 3, prsRaised: 3, prsReviewed: 2, activityScore: 84, pct: 20 },
    { userId: "u-noah", role: "QA" as RoleKey, ticketsDone: 2, prsRaised: 1, prsReviewed: 4, activityScore: 78, pct: 12 },
    { userId: "u-dev", role: "DevOps" as RoleKey, ticketsDone: 1, prsRaised: 1, prsReviewed: 2, activityScore: 70, pct: 6 },
  ],
  dependencies: [
    { label: "SQL → Backend", time: "6h", onTime: true },
    { label: "Backend → Frontend", time: "14h", onTime: true },
    { label: "Frontend → QA", time: "9h", onTime: true },
    { label: "QA → DevOps", time: "5h", onTime: true },
  ],
};

export const ROLE_COLORS: Record<RoleKey, string> = {
  Backend: "text-info", Frontend: "text-primary", QA: "text-success", DevOps: "text-warning", SQL: "text-sql", Mobile: "text-ui",
};

export const DOMAIN_COLORS: Record<Domain, string> = {
  Finance: "bg-success/15 text-success border-success/30",
  Healthcare: "bg-info/15 text-info border-info/30",
  "E-Commerce": "bg-primary/15 text-primary border-primary/30",
  Education: "bg-warning/15 text-warning border-warning/30",
  Logistics: "bg-ui/15 text-ui border-ui/30",
  "AI & ML": "bg-destructive/15 text-destructive border-destructive/30",
};

export const ALL_DOMAINS: Domain[] = ["Finance", "Healthcare", "E-Commerce", "Education", "Logistics", "AI & ML"];
