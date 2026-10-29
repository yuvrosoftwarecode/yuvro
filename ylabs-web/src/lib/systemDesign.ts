export const SYSTEM_DESIGN_LABS = [
  { slug: "system-design-lab", name: "System Design Lab", subject: "System Design", service: "Booking Service", entity: "system-design", action: "Design System", description: "Master end-to-end distributed system design across 4 progressive sprints: HLD, Sequence Flows, DBML Modeling, and REST API Engineering." },
  { slug: "systemdesign", name: "System Design Ecommere", subject: "E-commerce", service: "Order Service", entity: "orders", action: "Place order", description: "Design an e-commerce platform: catalog, checkout, inventory, payments and order processing." },
  { slug: "systemdesign-url-shortener", name: "System Design URL Shortener", subject: "URL Shortener", service: "URL Service", entity: "urls", action: "Shorten URL", description: "Design a URL shortener: short codes, fast redirects, caching and click analytics." },
  { slug: "systemdesign-bookmysystem", name: "System Design BookMySystem", subject: "BookMySystem", service: "Booking Service", entity: "bookings", action: "Reserve seat", description: "Design a booking platform: event discovery, seat availability, reservations and payments." },
] as const;

export function getSystemDesignLab(slug: string) {
  return SYSTEM_DESIGN_LABS.find(lab => lab.slug === slug);
}

export const SYSTEM_DESIGN_SPRINTS = [
  { id: "SD1", name: "Sprint 1 · HLD: High-Level Architecture", goal: "Identify components, connect services, and explain architectural choices using the drag-and-drop canvas", tags: ["HLD", "SD Fundamentals"] },
  { id: "SD2", name: "Sprint 2 · Sequence: Interaction Flows", goal: "Model interaction order, responses, alternative flows, and failure recovery using Mermaid", tags: ["Sequence", "Mermaid", "SD Scalability"] },
  { id: "SD3", name: "Sprint 3 · DB Schema: Data Modeling", goal: "Create schemas, define keys, enforce constraints, and choose indexes using DBML", tags: ["DB Schema", "DBML", "SD Databases"] },
  { id: "SD4", name: "Sprint 4 · REST API: Contract Design", goal: "Define resource endpoints, HTTP methods, request/response contracts, and build the capstone", tags: ["REST API", "SD Cases"] },
];