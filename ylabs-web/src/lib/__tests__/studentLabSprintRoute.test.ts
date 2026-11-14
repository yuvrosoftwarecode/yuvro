import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Student Lab Sprint Route & Navigation Flow", () => {
  test("1. Path pattern correctly matches and extracts lab slug and sprint ID", () => {
    const parseSprintPath = (pathname: string) => {
      const match = pathname.match(/^\/student\/lab\/([^/]+)\/sprint\/([^/?#]+)$/);
      if (!match) return null;
      return {
        slug: decodeURIComponent(match[1]),
        sprintId: decodeURIComponent(match[2]),
      };
    };

    assert.deepEqual(parseSprintPath("/student/lab/12/sprint/3"), {
      slug: "12",
      sprintId: "3",
    });

    assert.deepEqual(parseSprintPath("/student/lab/python-fundamentals/sprint/S1"), {
      slug: "python-fundamentals",
      sprintId: "S1",
    });

    assert.equal(parseSprintPath("/student/lab/12"), null);
    assert.equal(parseSprintPath("/student/lab/12/ticket/45"), null);
  });

  test("2. Plural sprint path (/sprints/:id) can be matched for redirect to canonical /sprint/:id", () => {
    const normalizeSprintUrl = (pathname: string) => {
      const pluralMatch = pathname.match(/^\/student\/lab\/([^/]+)\/sprints\/([^/?#]+)$/);
      if (pluralMatch) {
        return `/student/lab/${pluralMatch[1]}/sprint/${pluralMatch[2]}`;
      }
      return pathname;
    };

    assert.equal(
      normalizeSprintUrl("/student/lab/12/sprints/3"),
      "/student/lab/12/sprint/3"
    );
    assert.equal(
      normalizeSprintUrl("/student/lab/12/sprint/3"),
      "/student/lab/12/sprint/3"
    );
  });

  test("3. Sprint resolution from list of sprints supports numeric and string IDs", () => {
    const sprints = [
      { id: "S1", name: "Sprint 1 · Foundations", ticketIds: ["T1", "T2"] },
      { id: "2", name: "Sprint 2 · Intermediate", ticketIds: ["T3", "T4"] },
    ];

    const findSprint = (id: string) =>
      sprints.find((s) => s.id === id || String(s.id) === id) ?? null;

    assert.equal(findSprint("S1")?.name, "Sprint 1 · Foundations");
    assert.equal(findSprint("2")?.name, "Sprint 2 · Intermediate");
    assert.equal(findSprint("99"), null);
  });

  test("4. Ticket exit resolution returns to sprint route when sprint ID is known, and falls back to lab", () => {
    const resolveExitTarget = (
      slug: string,
      ticket: { sprint_id?: string | number | null; sprint?: string | number | null } | null,
      lastSprintSession: string | null
    ) => {
      const effectiveSprintId = ticket?.sprint_id || ticket?.sprint || lastSprintSession;
      if (effectiveSprintId) {
        return {
          to: "/student/lab/$slug/sprint/$sprintId",
          params: { slug, sprintId: String(effectiveSprintId) },
        };
      }
      return {
        to: "/student/lab/$slug",
        params: { slug },
      };
    };

    // Case A: ticket has sprint_id
    assert.deepEqual(resolveExitTarget("python", { sprint_id: "S2" }, null), {
      to: "/student/lab/$slug/sprint/$sprintId",
      params: { slug: "python", sprintId: "S2" },
    });

    // Case B: ticket lacks sprint_id but user visited sprint stored in session
    assert.deepEqual(resolveExitTarget("python", {}, "S3"), {
      to: "/student/lab/$slug/sprint/$sprintId",
      params: { slug: "python", sprintId: "S3" },
    });

    // Case C: neither available (direct link to ticket) -> falls back to lab
    assert.deepEqual(resolveExitTarget("python", {}, null), {
      to: "/student/lab/$slug",
      params: { slug: "python" },
    });
  });

  test("5. Ticket filtering within a sprint preserves status and difficulty constraints", () => {
    const tickets = [
      { id: "T1", title: "Write hello world", difficulty: "Beginner", status: "done" },
      { id: "T2", title: "Implement loop", difficulty: "Intermediate", status: "in_progress" },
      { id: "T3", title: "Binary search", difficulty: "Advanced", status: "backlog" },
    ];

    const filterSprintTickets = (
      ticketIds: string[],
      selectedDiffs: string[],
      selectedStatuses: string[],
      query: string
    ) => {
      return tickets
        .filter((t) => ticketIds.includes(t.id))
        .filter(
          (t) =>
            selectedDiffs.includes(t.difficulty) &&
            selectedStatuses.includes(t.status) &&
            t.title.toLowerCase().includes(query.toLowerCase())
        );
    };

    // Match all in sprint
    const all = filterSprintTickets(["T1", "T2"], ["Beginner", "Intermediate"], ["done", "in_progress"], "");
    assert.equal(all.length, 2);

    // Filter by query
    const queried = filterSprintTickets(["T1", "T2"], ["Beginner", "Intermediate"], ["done", "in_progress"], "hello");
    assert.equal(queried.length, 1);
    assert.equal(queried[0].id, "T1");

    // Filter by status
    const onlyDone = filterSprintTickets(["T1", "T2"], ["Beginner", "Intermediate"], ["done"], "");
    assert.equal(onlyDone.length, 1);
    assert.equal(onlyDone[0].id, "T1");
  });
});
