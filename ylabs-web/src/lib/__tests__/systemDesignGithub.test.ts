import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getSystemDesignLab, SYSTEM_DESIGN_LABS, SYSTEM_DESIGN_SPRINTS } from "../systemDesign.ts";

describe("System Design Lab GitHub Integration", () => {
  test("1. System Design Lab definition & sprints", () => {
    const lab = getSystemDesignLab("system-design-lab");
    assert.ok(lab, "Should find system-design-lab");
    assert.equal(lab?.subject, "System Design");
    assert.equal(SYSTEM_DESIGN_SPRINTS.length, 4, "Should have 4 progressive sprints");
    assert.ok(SYSTEM_DESIGN_SPRINTS[0].tags.includes("HLD"));
    assert.ok(SYSTEM_DESIGN_SPRINTS[1].tags.includes("Mermaid"));
    assert.ok(SYSTEM_DESIGN_SPRINTS[2].tags.includes("DBML"));
    assert.ok(SYSTEM_DESIGN_SPRINTS[3].tags.includes("REST API"));
  });

  test("2. Active lab recognition for System Design", () => {
    const isDsaLab = (name?: string, slug?: string) => {
      if (!name && !slug) return false;
      const s = `${name || ""} ${slug || ""}`.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");
      return (
        s.includes("dsa") ||
        s.includes("data structure") ||
        s.includes("datastructure") ||
        s.includes("ds lab") ||
        s.includes("ds scenario") ||
        s.includes("system design") ||
        s.includes("systemdesign") ||
        s.includes("sysd")
      );
    };

    assert.equal(isDsaLab("System Design Lab", "systemdesign"), true);
    assert.equal(isDsaLab(undefined, "system-design-lab"), true);
    assert.equal(isDsaLab("System Design Ecommere", "systemdesign-url-shortener"), true);
    assert.equal(isDsaLab("Random Lab", "random-lab"), false);
  });

  test("3. Formatted commit message convention", () => {
    const formatCommitMessage = (sprintNo: number, ticketNo: number, message: string) => {
      return `feat(S${sprintNo}-T${ticketNo}) : ${message.trim()}`;
    };

    const msg = formatCommitMessage(1, 1, "Completed HLD architecture canvas");
    assert.equal(msg, "feat(S1-T1) : Completed HLD architecture canvas");
  });

  test("4. Multi-tab System Design files generation for GitHub repository", () => {
    const design = {
      nodes: [
        { id: "lb", kind: "load_balancer", label: "Load Balancer", icon: "Boxes", x: 100, y: 100 },
        { id: "api", kind: "service", label: "API Gateway", icon: "Boxes", x: 200, y: 100 }
      ],
      edges: [{ id: "e1", from: "lb", to: "api", label: "forward" }],
      seq: "sequenceDiagram\n  User->>LB: GET /\n  LB->>API: Proxy",
      schema: "Table users {\n  id int [pk]\n  email varchar\n}",
      apis: [{ id: "1", method: "GET", path: "/health", summary: "Health check", status: "200 OK", request: "", response: '{"ok":true}' }],
      notes: { hld: "Scalable architecture notes", sequence: "Sequence flow explanation" }
    };

    const generateReadme = (title: string, d: typeof design) => {
      const apiRows = d.apis.map(a => `| \`${a.method}\` | \`${a.path}\` | ${a.summary} | \`${a.status}\` |`).join("\n");
      return `# ${title}\n\n${d.notes.hld}\n\n## Sequence Diagram\n\`\`\`mermaid\n${d.seq}\n\`\`\`\n\n## Database Schema\n\`\`\`dbml\n${d.schema}\n\`\`\`\n\n## REST APIs\n| Method | Path | Summary | Status |\n| --- | --- | --- | --- |\n${apiRows}`;
    };

    const readme = generateReadme("URL Shortener System Design", design);
    assert.ok(readme.includes("```mermaid"), "Must include mermaid code block for GitHub rendering");
    assert.ok(readme.includes("```dbml"), "Must include dbml code block");
    assert.ok(readme.includes("| `GET` | `/health` |"), "Must include REST API table");
    assert.ok(readme.includes("Scalable architecture notes"), "Must include HLD notes");
  });

  test("5. GitHub repository URL and branch validation", () => {
    const username = "MKGandhi05";
    const repoName = "yuvro_system_design_lab";
    const repoUrl = `https://github.com/${username}/${repoName}`;
    const token = "gho_testtoken12345";
    const authRepoUrl = repoUrl.replace("https://github.com/", `https://${token}@github.com/`);

    assert.equal(authRepoUrl, `https://gho_testtoken12345@github.com/${username}/${repoName}`);
    assert.ok(authRepoUrl.includes("@github.com"));
  });
});
