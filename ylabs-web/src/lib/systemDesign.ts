import type { EvaluationCriterion, EvaluationTab } from "./evaluation";

export const SYSTEM_DESIGN_LABS = [
  { slug: "system-design-lab", name: "System Design Lab", subject: "System Design", service: "Booking Service", entity: "system-design", action: "Design System", description: "Master end-to-end distributed system design across progressive sprints: HLD, Sequence Flows, DBML Modeling, and REST API Engineering." },
  { slug: "systemdesign", name: "System Design Ecommere", subject: "E-commerce", service: "Order Service", entity: "orders", action: "Place order", description: "Design an e-commerce platform: catalog, checkout, inventory, payments and order processing." },
  { slug: "systemdesign-url-shortener", name: "System Design URL Shortener", subject: "URL Shortener", service: "URL Service", entity: "urls", action: "Shorten URL", description: "Design a URL shortener: short codes, fast redirects, caching and click analytics." },
  { slug: "systemdesign-bookmysystem", name: "System Design BookMySystem", subject: "BookMySystem", service: "Booking Service", entity: "bookings", action: "Reserve seat", description: "Design a booking platform: event discovery, seat availability, reservations and payments." },
] as const;

export function getSystemDesignLab(slug: string) {
  return SYSTEM_DESIGN_LABS.find(lab => lab.slug === slug);
}

// Requirements map to actual sprint tasks. Reasoning stays pending until reviewed.
const TASK_REQUIREMENTS: Record<string, { tabs: EvaluationTab[]; requirements: string[] }> = {
  "SD-101": { tabs: ["notes"], requirements: ["Explain consistency, availability and partition tolerance.", "Compare consistency versus availability during a network partition.", "Support the trade-offs with realistic scenarios."] },
  "SD-102": { tabs: ["notes"], requirements: ["Define p50, p95 and p99 latency targets.", "Specify throughput and a service SLO.", "Calculate and explain the error budget."] },
  "SD-103": { tabs: ["api", "notes"], requirements: ["Define REST endpoints with valid request methods and paths.", "Describe booking request and response contracts.", "Explain the chosen API versioning strategy."] },
  "SD-104": { tabs: ["hld", "notes"], requirements: ["Compare horizontal and vertical scaling.", "Discuss cost and failure characteristics.", "Explain elasticity and the chosen scaling approach."] },
  "SD-105": { tabs: ["hld", "notes"], requirements: ["Design L4 versus L7 load balancing.", "Describe active health checks.", "Describe passive health checks and unhealthy instance handling."] },
  "SD-106": { tabs: ["notes"], requirements: ["Compare fixed-window rate limiting.", "Compare sliding-window rate limiting.", "Explain token-bucket behavior and trade-offs."] },
  "SD-107": { tabs: ["hld", "sequence", "notes"], requirements: ["Design a cache-aside read flow including cache misses.", "Define cache TTLs.", "Describe cache invalidation and stale-data handling."] },
  "SD-108": { tabs: ["hld", "notes"], requirements: ["Identify which assets should be served through a CDN.", "Design edge caching behavior.", "Explain CDN invalidation."] },
  "SD-109": { tabs: ["sequence", "notes"], requirements: ["Compare Redis cache-aside.", "Compare write-through caching.", "Compare write-behind caching and consistency trade-offs."] },
  "SD-110": { tabs: ["schema", "notes"], requirements: ["Choose a datastore for a social feed.", "Choose a datastore for analytics.", "Justify an order-ledger datastore and integrity requirements."] },
  "SD-111": { tabs: ["schema", "notes"], requirements: ["Design a shard key for a users table.", "Explain hotspot handling.", "Plan re-sharding and data migration."] },
  "SD-112": { tabs: ["hld", "notes"], requirements: ["Compare synchronous replication.", "Compare asynchronous replication.", "Choose and justify a consistency model."] },
  "SD-113": { tabs: ["hld", "sequence", "notes"], requirements: ["Model producer and consumer topology using Kafka or SQS.", "Explain message partitioning.", "Define consumer groups and delivery handling."] },
  "SD-114": { tabs: ["hld", "sequence", "notes"], requirements: ["Design an event-driven checkout flow.", "Specify checkout events and consumers.", "Explain idempotent consumer processing."] },
  "SD-115": { tabs: ["hld", "sequence", "schema", "api", "notes"], requirements: ["Define short-code generation and collision handling.", "Design storage and URL relationships.", "Design cache-backed redirect request and response flows.", "Define URL creation and redirect API contracts.", "Design redirect analytics at scale and document trade-offs."] },
  "SD-116": { tabs: ["hld", "sequence", "schema", "notes"], requirements: ["Design one-to-one and group chat.", "Model presence.", "Design delivery receipts.", "Handle offline message queues."] },
};

export function getSystemDesignCriteria(ticketId: string, title: string, description: string): EvaluationCriterion[] {
  const task = TASK_REQUIREMENTS[ticketId];
  const requirements = task?.requirements ?? [description || title];
  return requirements.map((requirement, i) => ({
    id: `${ticketId}-${i + 1}`,
    title: requirement,
    description,
    maxMarks: 100 / requirements.length,
    tabs: task?.tabs ?? ["notes"],
    rule: ticketId === "SD-103" && i === 0 ? "api-contract" : "review",
  }));
}

export const SYSTEM_DESIGN_SPRINTS = [
  { id: "SD1", name: "Sprint 1 · Fundamentals", goal: "Requirements, SLOs and API contracts", tags: ["SD Fundamentals", "HLD"] },
  { id: "SD2", name: "Sprint 2 · Scalability", goal: "Scaling, load balancing and rate limiting", tags: ["SD Scalability", "Mermaid", "Sequence"] },
  { id: "SD3", name: "Sprint 3 · Caching", goal: "Cache strategies, CDN and invalidation", tags: ["SD Caching", "DBML", "DB Schema"] },
  { id: "SD4", name: "Sprint 4 · Databases", goal: "Data modeling, sharding and consistency", tags: ["SD Databases", "REST API"] },
  { id: "SD5", name: "Sprint 5 · Messaging", goal: "Queues and event-driven workflows", tags: ["SD Messaging"] },
  { id: "SD6", name: "Sprint 6 · End-to-end Design", goal: "Connect HLD, sequence diagrams, database schema and LLD", tags: ["SD Cases"] },
];
