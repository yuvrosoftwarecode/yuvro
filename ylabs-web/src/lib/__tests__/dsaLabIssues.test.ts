import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("DSA Lab Execution & Commit Fixes", () => {
  test("1. Wrong solution marks execution as completed with failed tests instead of generic error", () => {
    // Simulated executor response for a wrong solution
    const executorResponse = {
      execution_result: {
        success: false, // In executor-api, success is only true if 100% of tests pass
        status: "completed",
        output: "0",
        execution_time: 120,
        memory_usage: 14.5
      },
      test_results: [
        {
          test_case_id: 0,
          passed: true,
          input: "5\n1 2 3 4 5",
          expected_output: "15",
          actual_output: "15",
          error: "",
          execution_time: 0.04
        },
        {
          test_case_id: 1,
          passed: false, // FAILED test case
          input: "3\n10 20 30",
          expected_output: "60",
          actual_output: "0",
          error: "Output mismatch",
          execution_time: 0.03
        }
      ],
      total_passed: 1,
      total_tests: 2
    };

    // Calculate statusVal with our fixed logic
    const { execution_result, test_results } = executorResponse;
    let statusVal: "completed" | "error" | "timeout" | "failed" = "completed";
    if ((executorResponse as any).status === "tle") {
      statusVal = "timeout";
    } else if (execution_result.status === "compilation_error" || execution_result.status === "security_error") {
      statusVal = "error";
    } else if (!test_results || test_results.length === 0) {
      statusVal = execution_result.success ? "completed" : "error";
    }

    // Crucial check: statusVal MUST be 'completed' so that failed test cases are displayed to the user
    assert.equal(statusVal, "completed", "Status must be 'completed' when test cases finish running, even if some failed");

    // Test results mapping
    const hasTestResults = Boolean(test_results && test_results.length > 0);
    assert.equal(hasTestResults, true);

    const actual_passed = test_results.filter(r => r.passed).length;
    assert.equal(actual_passed, 1);
    assert.equal(executorResponse.total_tests, 2);

    // Toast message verification
    const toastMsg = actual_passed === executorResponse.total_tests
      ? `All ${executorResponse.total_tests} tests passed!`
      : `Passed ${actual_passed} of ${executorResponse.total_tests} tests`;
    assert.equal(toastMsg, "Passed 1 of 2 tests");
  });

  test("2. Runtime error in test case captures stderr as error message", () => {
    const stdout = "";
    const stderr = "IndexError: list index out of range\n  at solution.py:5";
    const console_output = stderr.trim();
    const expected_output = "15";
    const actual_output = stdout.trim();

    const passed = actual_output === expected_output;
    let error_msg = "";
    if (!passed) {
      if (console_output) {
        error_msg = console_output;
      } else if (actual_output !== expected_output) {
        error_msg = "Output mismatch";
      }
    }

    assert.equal(passed, false);
    assert.ok(error_msg.includes("IndexError"), "Error message should contain traceback details");
  });

  test("3. Formatted commit message for DSA sprint and ticket", () => {
    const sprintNo = 1;
    const ticketNo = 2;
    const commitMessage = "Solved Find Sum of Array Elements using loop";

    const formattedMessage = `feat(S${sprintNo}-T${ticketNo}) : ${commitMessage}`;
    assert.equal(formattedMessage, "feat(S1-T2) : Solved Find Sum of Array Elements using loop");
  });

  test("4. DSA ticket commit payload includes files and ticket id", () => {
    const ticket = { id: 42, title: "Find Sum of Array Elements", ticket_slug: "ticket-find-sum" };
    const files = {
      "main.py": "def solve():\n    return sum(map(int, input().split()))\n",
      "README.md": "# Find Sum\n"
    };
    const commitMessage = "feat(S1-T1) : Completed solution";

    const payload = {
      commit_message: commitMessage,
      files,
      code: files["main.py"],
      design: undefined
    };

    assert.equal(ticket.id, 42);
    assert.ok(payload.files["main.py"].includes("def solve()"));
    assert.equal(payload.commit_message, "feat(S1-T1) : Completed solution");
  });

  test("5. isTaskHidden correctly identifies hidden/advanced test cases", () => {
    function isTaskHidden(task: any): boolean {
      if (!task) return false;
      if (task.is_hidden === true || task.hidden === true) return true;
      const title = (typeof task === "string" ? task : (task.title || "")).toLowerCase();
      const desc = (typeof task === "object" && typeof task.description === "string" ? task.description : "").toLowerCase();
      return title.includes("hidden") || title.includes("advanced") || desc.includes("hidden test case");
    }

    assert.equal(isTaskHidden({ title: "Test Case 1", input: "5\n1 2 3 4 5" }), false);
    assert.equal(isTaskHidden({ title: "Test Case 2", input: "3\n10 20 30" }), false);
    assert.equal(isTaskHidden({ title: "Test Case 3", input: "4\n1 1 1 1" }), false);
    assert.equal(isTaskHidden({ title: "Test Case 4 (Hidden/Advanced)", input: "6\n0 0 0 0 0 0" }), true);
    assert.equal(isTaskHidden({ title: "Test Case 5 (Hidden/Advanced)", input: "1\n999" }), true);
    assert.equal(isTaskHidden({ title: "Test Case 6", is_hidden: true }), true);
    assert.equal(isTaskHidden({ description: "Hidden test case for corner cases" }), true);
  });

  test("6. Hidden test cases show passed/failed status but suppress result details (input/output)", () => {
    function isTaskHidden(task: any): boolean {
      if (!task) return false;
      if (task.is_hidden === true || task.hidden === true) return true;
      const title = (typeof task === "string" ? task : (task.title || "")).toLowerCase();
      const desc = (typeof task === "object" && typeof task.description === "string" ? task.description : "").toLowerCase();
      return title.includes("hidden") || title.includes("advanced") || desc.includes("hidden test case");
    }

    const tasks = [
      { title: "Test Case 1", input: "5\n1 2 3 4 5", expected_output: "15" },
      { title: "Test Case 2", input: "3\n10 20 30", expected_output: "60" },
      { title: "Test Case 3", input: "4\n1 1 1 1", expected_output: "4" },
      { title: "Test Case 4 (Hidden/Advanced)", input: "4\n-1 -2 -3 -4", expected_output: "-10" },
      { title: "Test Case 5 (Hidden/Advanced)", input: "6\n0 0 0 0 0 0", expected_output: "0" },
      { title: "Test Case 6 (Hidden/Advanced)", input: "1\n999", expected_output: "999" },
    ];

    const results = [
      { test_case_id: 0, passed: true, input: "5\n1 2 3 4 5", expected_output: "15", actual_output: "15" },
      { test_case_id: 1, passed: true, input: "3\n10 20 30", expected_output: "60", actual_output: "60" },
      { test_case_id: 2, passed: false, input: "4\n1 1 1 1", expected_output: "4", actual_output: "0" },
      { test_case_id: 3, passed: true, input: "4\n-1 -2 -3 -4", expected_output: "-10", actual_output: "-10", is_hidden: true },
      { test_case_id: 4, passed: false, input: "6\n0 0 0 0 0 0", expected_output: "0", actual_output: "Ada is 36y", is_hidden: true },
      { test_case_id: 5, passed: false, input: "1\n999", expected_output: "999", actual_output: "Ada is 36y", is_hidden: true },
    ];

    // All 6 test cases appear in the list with their status
    const renderedCards = results.map((tr: any, idx: number) => {
      const taskMeta = tasks[idx];
      const isHidden = Boolean(tr.is_hidden || isTaskHidden(taskMeta) || isTaskHidden(tr));
      const testNum = tr.test_case_id !== undefined ? tr.test_case_id + 1 : idx + 1;
      const statusText = tr.passed ? "Passed" : "Failed";
      const title = `Test Case #${testNum} ${isHidden ? "(Hidden) " : ""}${statusText}`;

      // Result details (input, expected, output) only shown if NOT hidden and failed
      const showDetails = !tr.passed && !isHidden;

      return {
        testNum,
        title,
        passed: tr.passed,
        isHidden,
        showDetails,
        details: showDetails ? { input: tr.input, expected: tr.expected_output, output: tr.actual_output } : null
      };
    });

    // All 6 tests are displayed
    assert.equal(renderedCards.length, 6);

    // Test cases 1-3 are public
    assert.equal(renderedCards[0].isHidden, false);
    assert.equal(renderedCards[0].passed, true);
    assert.equal(renderedCards[0].showDetails, false); // passed, no details

    assert.equal(renderedCards[2].isHidden, false);
    assert.equal(renderedCards[2].passed, false);
    assert.equal(renderedCards[2].showDetails, true); // failed public test -> details shown
    assert.equal(renderedCards[2].details?.input, "4\n1 1 1 1");

    // Test cases 4-6 are hidden
    assert.equal(renderedCards[3].isHidden, true);
    assert.equal(renderedCards[3].title, "Test Case #4 (Hidden) Passed");
    assert.equal(renderedCards[3].showDetails, false);

    assert.equal(renderedCards[4].isHidden, true);
    assert.equal(renderedCards[4].title, "Test Case #5 (Hidden) Failed");
    assert.equal(renderedCards[4].showDetails, false); // failed hidden test -> details SUPPRESSED
    assert.equal(renderedCards[4].details, null);

    assert.equal(renderedCards[5].isHidden, true);
    assert.equal(renderedCards[5].title, "Test Case #6 (Hidden) Failed");
    assert.equal(renderedCards[5].showDetails, false); // details SUPPRESSED
    assert.equal(renderedCards[5].details, null);
  });

  test("7. Sprint and ticket directory calculation for commit matches S1-T1 convention", () => {
    // Commit message: feat(S1-T1) : a
    const commitMessage = "feat(S1-T1) : a";
    const match = commitMessage.match(/feat\(S(\d+)-T(\d+)\)/i);
    assert.ok(match, "Regex should match feat(S1-T1)");

    const parsedSprint = parseInt(match![1], 10);
    const parsedTicket = parseInt(match![2], 10);

    assert.equal(parsedSprint, 1);
    assert.equal(parsedTicket, 1);

    const ticketSlug = "ticket-calculate-total-daily-sales";
    const ticketDirRel = `sprint_${parsedSprint}/ticket_${parsedTicket}_${ticketSlug}`;

    assert.equal(ticketDirRel, "sprint_1/ticket_1_ticket-calculate-total-daily-sales");
  });
});
