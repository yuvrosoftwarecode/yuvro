import type { Design, Notes } from "./systemDesign";

export interface TaskEvaluation {
  id: string;
  title: string;
  description?: string;
  passed: boolean;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface SystemDesignEvaluationResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  passedCount: number;
  totalCount: number;
  status: "passed" | "needs_work";
  tasks: TaskEvaluation[];
  summary: string[];
  metrics: {
    nodeCount: number;
    edgeCount: number;
    hasSequence: boolean;
    hasSchema: boolean;
    apiCount: number;
    hasNotes: boolean;
  };
}

interface ComponentDef {
  name: string;
  patterns: RegExp[];
}

const KNOWN_COMPONENTS: ComponentDef[] = [
  { name: "Web Client", patterns: [/\bweb client\b/i, /\bclient\b/i, /\bbrowser\b/i, /\bfrontend\b/i] },
  { name: "Mobile App", patterns: [/\bmobile app\b/i, /\bmobile\b/i, /\bapp client\b/i] },
  { name: "User / Actor", patterns: [/\buser\b/i, /\bactor\b/i, /\bcustomer\b/i] },
  { name: "API Gateway", patterns: [/\bapi gateway\b/i, /\bgateway\b/i, /\breverse proxy\b/i] },
  { name: "Load Balancer", patterns: [/\bload balancer\b/i, /\bbalancer\b/i, /\blb\b/i, /\balb\b/i] },
  { name: "Product Service", patterns: [/\bproduct service\b/i, /\bcatalog service\b/i, /\bproduct\b/i] },
  { name: "Order Service", patterns: [/\border service\b/i, /\border processing\b/i, /\border\b/i] },
  { name: "URL Service", patterns: [/\burl service\b/i, /\burl shortener\b/i, /\bshortener\b/i] },
  { name: "Notification Service", patterns: [/\bnotification service\b/i, /\bnotification\b/i, /\bnotifier\b/i] },
  { name: "Auth Service", patterns: [/\bauth service\b/i, /\bauthentication service\b/i, /\bauth\b/i] },
  { name: "Streaming Service", patterns: [/\bstreaming service\b/i, /\bstreaming\b/i, /\bvideo service\b/i] },
  { name: "PostgreSQL", patterns: [/\bpostgresql\b/i, /\bpostgres\b/i] },
  { name: "MySQL", patterns: [/\bmysql\b/i] },
  { name: "Database", patterns: [/\bdatabase\b/i, /\bdata store\b/i, /\bdatastore\b/i, /\bsql db\b/i, /\bdb\b/i] },
  { name: "Redis", patterns: [/\bredis\b/i, /\bcache\b/i, /\bmemcached\b/i] },
  { name: "Kafka", patterns: [/\bkafka\b/i, /\bevent bus\b/i] },
  { name: "Message Queue", patterns: [/\bmessage queue\b/i, /\bqueue\b/i, /\bsqs\b/i, /\brabbitmq\b/i] },
  { name: "Worker", patterns: [/\bworker\b/i, /\bbackground worker\b/i, /\bconsumer\b/i] },
  { name: "CDN", patterns: [/\bcdn\b/i, /\bcloudfront\b/i] },
  { name: "Object Storage", patterns: [/\bobject storage\b/i, /\bs3\b/i, /\bblob storage\b/i, /\bblob\b/i] },
];

function matchNode(nodeText: string, def: ComponentDef): boolean {
  return def.patterns.some((p) => p.test(nodeText));
}

export function evaluateSystemDesign(
  design: Design,
  ticketData?: any
): SystemDesignEvaluationResult {
  const nodes = design.nodes || [];
  const edges = design.edges || [];
  const seq = design.seq || "";
  const schema = design.schema || "";
  const apis = design.apis || [];
  const notes = design.notes || ({} as Notes);

  const nodeTexts = nodes.map(
    (n) => `${n.label || ""} ${n.kind || ""}`.toLowerCase()
  );

  const nodeMap = new Map<string, string>();
  nodes.forEach((n) => {
    nodeMap.set(n.id, `${n.label || ""} ${n.kind || ""}`.toLowerCase());
  });

  const hasEdgeLabels = edges.some(
    (e) => Boolean(e.label && e.label.trim().length > 0)
  );

  let rawTasks: any[] = [];
  if (Array.isArray(ticketData?.tasks) && ticketData.tasks.length > 0) {
    rawTasks = ticketData.tasks;
  } else {
    rawTasks = [
      "Add the core architectural components required for this service.",
      "Connect the components in the correct client-server request flow.",
      "Configure required data stores, caching, or messaging queues.",
      "Document key architectural decisions, trade-offs, or schemas.",
    ];
  }

  const totalTasks = rawTasks.length;
  const maxPerTask = totalTasks > 0 ? Math.round(100 / totalTasks) : 25;

  const taskEvaluations: TaskEvaluation[] = rawTasks.map((t, idx) => {
    const tTitle =
      typeof t === "string" ? t : t.title || t.description || `Task ${idx + 1}`;
    const tDesc = typeof t === "object" ? t.description : undefined;
    const tMarks =
      typeof t === "object" && typeof t.marks === "number"
        ? t.marks
        : maxPerTask;
    const tLower = tTitle.toLowerCase();

    let passed = false;
    let earned = 0;
    let feedback = "";

    // A. Explicit Connection / Routing Intent
    const isConnectionTask =
      (/\bconnect\b/i.test(tLower) || /\broute\b/i.test(tLower) || /\brouting\b/i.test(tLower) || /\bentry point\b/i.test(tLower)) &&
      !/\badd\b/i.test(tLower);

    const isLabelTask = /\blabel\b/i.test(tLower) && /\bconnection/i.test(tLower);

    const isDecoupleTask =
      (/\bseparate\b/i.test(tLower) || /\bdecouple\b/i.test(tLower) || /\bdistinguish\b/i.test(tLower)) &&
      !/\bconnect\b/i.test(tLower);

    if (isLabelTask) {
      if (edges.length >= 2 && hasEdgeLabels) {
        passed = true;
        earned = tMarks;
        feedback = "Connection lines are routed and labeled with protocol or action names.";
      } else if (hasEdgeLabels) {
        passed = false;
        earned = Math.round(tMarks * 0.5);
        feedback = "Some connections are labeled. Ensure all primary client, cache, and database paths are labeled.";
      } else {
        passed = false;
        earned = 0;
        feedback = "Connect components and label the connection lines with request flows (e.g. read, write, HTTPS).";
      }
    } else if (isDecoupleTask) {
      // Check if there are separate service instances or separate compute nodes
      const serviceLikeNodes = nodes.filter((n) =>
        /service|worker|instance|process|app/i.test(`${n.label} ${n.kind}`)
      );
      if (serviceLikeNodes.length >= 2) {
        passed = true;
        earned = tMarks;
        feedback = `Decoupled workloads into ${serviceLikeNodes.length} dedicated service components: ${serviceLikeNodes.map((n) => n.label).join(", ")}.`;
      } else {
        passed = false;
        earned = serviceLikeNodes.length > 0 ? Math.round(tMarks * 0.5) : 0;
        feedback = "Add separate service nodes on the canvas to isolate browsing from order/creation workloads.";
      }
    } else if (isConnectionTask) {
      // Check if edges exist and connect appropriate layers
      const hasClientToGateway = edges.some((e) => {
        const fromTxt = nodeMap.get(e.from) || "";
        const toTxt = nodeMap.get(e.to) || "";
        return (
          (/client|user|app|actor/i.test(fromTxt) && /gateway|load balancer|balancer|lb|proxy/i.test(toTxt)) ||
          (/client|user|app|actor/i.test(fromTxt) && /service|shortener/i.test(toTxt))
        );
      });

      const hasServiceToDb = edges.some((e) => {
        const fromTxt = nodeMap.get(e.from) || "";
        const toTxt = nodeMap.get(e.to) || "";
        return (
          /service|shortener|worker/i.test(fromTxt) &&
          /database|db|postgres|mysql|redis|cache|mongo|dynamo/i.test(toTxt)
        );
      });

      if (edges.length >= 3 && (hasClientToGateway || hasServiceToDb)) {
        passed = true;
        earned = tMarks;
        feedback = `Configured valid request flows and data connections (${edges.length} connections placed).`;
      } else if (edges.length >= 1) {
        passed = false;
        earned = Math.round(tMarks * 0.5);
        feedback = "Connect services to their corresponding data stores and clients to entry gateways.";
      } else {
        passed = false;
        earned = 0;
        feedback = "Drag connection lines from component connectors to link clients, services, and databases.";
      }
    }
    // B. Sequence Diagram Check
    else if (
      /\bsequence\b/i.test(tLower) ||
      /\bmermaid\b/i.test(tLower) ||
      /\bparticipant\b/i.test(tLower) ||
      /\binteraction flow\b/i.test(tLower)
    ) {
      const hasSeq = seq.includes("sequenceDiagram");
      const hasParticipants = seq.includes("participant") || seq.includes("actor");
      const hasArrows = seq.includes("->>") || seq.includes("-->>");
      const hasBranch = ["alt", "else", "opt", "critical"].some((k) => seq.includes(k));
      const needsBranch = /\berror\b/i.test(tLower) || /\bbranch\b/i.test(tLower) || /\bfail\b/i.test(tLower) || /\bretry\b/i.test(tLower);

      if (hasSeq && hasParticipants && hasArrows && (!needsBranch || hasBranch)) {
        passed = true;
        earned = tMarks;
        feedback = "Sequence diagram defines interaction flows, participants, and branch handling.";
      } else if (hasSeq && hasArrows) {
        passed = false;
        earned = Math.round(tMarks * 0.6);
        feedback = "Sequence diagram is present; add alternative flows or error branches as requested.";
      } else {
        passed = false;
        earned = 0;
        feedback = "Switch to Sequence tab and model the interaction flow with participants and messages.";
      }
    }
    // C. DBML Schema Check
    else if (
      /\bschema\b/i.test(tLower) ||
      /\bdbml\b/i.test(tLower) ||
      /\btable\b/i.test(tLower) ||
      /\bforeign key\b/i.test(tLower) ||
      /\bprimary key\b/i.test(tLower)
    ) {
      const hasTable = schema.toLowerCase().includes("table ") || schema.includes("Table");
      const hasPk = schema.includes("[pk]") || schema.includes("pk");

      if (hasTable && hasPk) {
        passed = true;
        earned = tMarks;
        feedback = "Database schema defined with tables and primary keys.";
      } else if (hasTable) {
        passed = false;
        earned = Math.round(tMarks * 0.5);
        feedback = "Tables defined, but primary keys [pk] or constraints should be explicitly specified.";
      } else {
        passed = false;
        earned = 0;
        feedback = "Switch to DB Schema tab and define tables with fields, primary keys, and relationships.";
      }
    }
    // D. REST API Check
    else if (
      /\bapi\b/i.test(tLower) ||
      /\bendpoint\b/i.test(tLower) ||
      /\brest\b/i.test(tLower) ||
      /\bhttp\b/i.test(tLower)
    ) {
      if (apis.length >= 2 && apis.some((a) => a.path && a.path.startsWith("/"))) {
        passed = true;
        earned = tMarks;
        feedback = `Defined ${apis.length} REST API endpoints with HTTP methods, paths, and status codes.`;
      } else if (apis.length >= 1) {
        passed = false;
        earned = Math.round(tMarks * 0.6);
        feedback = `Found ${apis.length} endpoint; add additional endpoints to cover required operations.`;
      } else {
        passed = false;
        earned = 0;
        feedback = "Switch to REST API tab and define the required endpoints and request/response contracts.";
      }
    }
    // E. Trade-offs / Documentation Check
    else if (
      /\btrade-off\b/i.test(tLower) ||
      /\bbottleneck\b/i.test(tLower) ||
      /\bdocument\b/i.test(tLower) ||
      /\bstrategy\b/i.test(tLower)
    ) {
      const allNotes = Object.values(notes).join(" ");
      if (allNotes.trim().length >= 30) {
        passed = true;
        earned = tMarks;
        feedback = "Architectural trade-offs and decisions documented in Solution Notes.";
      } else {
        passed = false;
        earned = 0;
        feedback = "Document key trade-offs and scaling strategies in the Solution Notes drawer.";
      }
    }
    // F. Component Checklist (Add X, Y, Z components)
    else {
      // Find which known components this task specifically asks for
      const requiredComponents: ComponentDef[] = [];

      for (const comp of KNOWN_COMPONENTS) {
        // If the task title matches the component pattern
        if (comp.patterns.some((p) => p.test(tTitle))) {
          // Avoid duplicate generic matches:
          // e.g., if "Product Service" or "Order Service" is in required, do not add generic "Database" or "Microservice"
          if (comp.name === "Database" && requiredComponents.some((c) => c.name === "PostgreSQL" || c.name === "MySQL")) {
            continue;
          }
          if (!requiredComponents.some((c) => c.name === comp.name)) {
            requiredComponents.push(comp);
          }
        }
      }

      if (requiredComponents.length > 0) {
        const found = requiredComponents.filter((comp) =>
          nodeTexts.some((txt) => matchNode(txt, comp))
        );
        const missing = requiredComponents.filter(
          (comp) => !nodeTexts.some((txt) => matchNode(txt, comp))
        );

        if (missing.length === 0) {
          passed = true;
          earned = tMarks;
          feedback = `Added required components: ${found.map((c) => c.name).join(", ")}.`;
        } else if (found.length > 0) {
          passed = false;
          earned = Math.round(tMarks * (found.length / requiredComponents.length));
          feedback = `Missing on canvas: ${missing.map((c) => c.name).join(", ")}.`;
        } else {
          passed = false;
          earned = 0;
          feedback = `Missing on canvas: ${missing.map((c) => c.name).join(", ")}.`;
        }
      } else {
        // Generic fallback check
        if (nodes.length >= 3 && edges.length >= 2) {
          passed = true;
          earned = tMarks;
          feedback = "Requirements satisfied by the architecture structure.";
        } else {
          passed = false;
          earned = 0;
          feedback = "Add and connect components on the canvas to satisfy task requirements.";
        }
      }
    }

    return {
      id: `task_${idx + 1}`,
      title: tTitle,
      description: tDesc,
      passed,
      score: earned,
      maxScore: tMarks,
      feedback,
    };
  });

  const totalScore = taskEvaluations.reduce((acc, t) => acc + t.score, 0);
  const maxPossibleScore =
    taskEvaluations.reduce((acc, t) => acc + t.maxScore, 0) || 100;
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((totalScore / maxPossibleScore) * 100))
  );
  const passedCount = taskEvaluations.filter((t) => t.passed).length;

  const summary: string[] = [];
  if (percentage >= 70) {
    summary.push(`Ready to submit! ${passedCount}/${totalTasks} tasks passed (${percentage}%).`);
  } else {
    summary.push(`Keep going: ${passedCount}/${totalTasks} tasks passed (${percentage}%).`);
  }

  return {
    totalScore: percentage,
    maxPossibleScore: 100,
    percentage,
    passedCount,
    totalCount: totalTasks,
    status: percentage >= 70 ? "passed" : "needs_work",
    tasks: taskEvaluations,
    summary,
    metrics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasSequence: Boolean(seq.trim()),
      hasSchema: Boolean(schema.trim()),
      apiCount: apis.length,
      hasNotes: Object.values(notes).some((v) => Boolean(v && v.trim())),
    },
  };
}
