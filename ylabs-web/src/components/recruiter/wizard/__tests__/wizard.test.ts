import test from "node:test";
import assert from "node:assert/strict";

// Pure splitDistribution test
function splitDistribution(weights: number[], total: number): number[] {
  const n = weights.length;
  const sumWeights = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sumWeights) * total);
  const out = raw.map((r) => Math.max(1, Math.floor(r)));
  let diff = total - out.reduce((a, b) => a + b, 0);

  while (diff > 0) {
    let bestIdx = 0;
    let maxFraction = -1;
    raw.forEach((r, idx) => {
      const frac = r - out[idx];
      if (frac > maxFraction) {
        maxFraction = frac;
        bestIdx = idx;
      }
    });
    out[bestIdx]++;
    diff--;
  }

  while (diff < 0) {
    let bestIdx = -1;
    let maxFloor = -1;
    out.forEach((o, idx) => {
      if (o > 1 && o > maxFloor) {
        maxFloor = o;
        bestIdx = idx;
      }
    });
    if (bestIdx < 0) break;
    out[bestIdx]--;
    diff++;
  }

  return out;
}

test("Wizard: splitDistribution accurately divides marks and minutes without rounding error", () => {
  const weights = [3, 4, 3];
  const marks = splitDistribution(weights, 10);
  assert.equal(marks.length, 3);
  assert.equal(marks.reduce((a, b) => a + b, 0), 10);

  const dur = splitDistribution(weights, 30);
  assert.equal(dur.length, 3);
  assert.equal(dur.reduce((a, b) => a + b, 0), 30);

  // Uneven weights
  const uneven = splitDistribution([2, 3, 3, 2], 10);
  assert.equal(uneven.reduce((a, b) => a + b, 0), 10);
});

test("Wizard: Publish gating correctly checks all completion criteria", () => {
  function getPublishBlockReason(state: {
    tasks: any[];
    testCommand: string;
    rules: any;
    rulesOutOfDate?: boolean;
    verificationPassed: boolean;
    pushed: string | null;
  }): string {
    if (!state.tasks.length) return "Add at least one task before publishing";
    if (!state.testCommand.trim()) return "Configure a test command before publishing";
    if (!state.rules || !state.rules.files || Object.keys(state.rules.files).length === 0) {
      return "Generate scoring rules before publishing";
    }
    if (state.rulesOutOfDate) {
      return "Regenerate scoring rules for updated tasks before publishing";
    }
    if (!state.verificationPassed) {
      return "Run and pass sandbox verification before publishing";
    }
    if (!state.pushed) {
      return "Push scoring rules to the repository before publishing";
    }
    return "";
  }

  // 1. Missing tasks
  assert.equal(
    getPublishBlockReason({
      tasks: [],
      testCommand: "pytest",
      rules: { files: { "test.py": "code" } },
      verificationPassed: true,
      pushed: "12:00",
    }),
    "Add at least one task before publishing"
  );

  // 2. Missing test command
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "",
      rules: { files: { "test.py": "code" } },
      verificationPassed: true,
      pushed: "12:00",
    }),
    "Configure a test command before publishing"
  );

  // 3. Missing rules
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "pytest",
      rules: null,
      verificationPassed: true,
      pushed: "12:00",
    }),
    "Generate scoring rules before publishing"
  );

  // 4. Out-of-date rules
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "pytest",
      rules: { files: { "test.py": "code" } },
      rulesOutOfDate: true,
      verificationPassed: true,
      pushed: "12:00",
    }),
    "Regenerate scoring rules for updated tasks before publishing"
  );

  // 5. Unverified
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "pytest",
      rules: { files: { "test.py": "code" } },
      verificationPassed: false,
      pushed: "12:00",
    }),
    "Run and pass sandbox verification before publishing"
  );

  // 6. Not pushed
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "pytest",
      rules: { files: { "test.py": "code" } },
      verificationPassed: true,
      pushed: null,
    }),
    "Push scoring rules to the repository before publishing"
  );

  // 7. All criteria satisfied
  assert.equal(
    getPublishBlockReason({
      tasks: [{ id: "t1" }],
      testCommand: "pytest",
      rules: { files: { "test.py": "code" } },
      verificationPassed: true,
      pushed: "12:00",
    }),
    ""
  );
});

test("Wizard: Guided single primary action calculation", () => {
  function getGuidedStep(state: {
    startup: string;
    test: string;
    hasRules: boolean;
    rulesOutOfDate: boolean;
    isVerified: boolean;
    isPushed: boolean;
  }): "commands" | "rules" | "verify" | "push" | "publish" {
    const hasCommands = Boolean(state.startup.trim() && state.test.trim());
    if (!hasCommands) return "commands";
    if (!state.hasRules || state.rulesOutOfDate) return "rules";
    if (!state.isVerified) return "verify";
    if (!state.isPushed) return "push";
    return "publish";
  }

  // 1. Initial Step 5: commands missing -> guided action is "commands"
  assert.equal(
    getGuidedStep({
      startup: "",
      test: "",
      hasRules: false,
      rulesOutOfDate: false,
      isVerified: false,
      isPushed: false,
    }),
    "commands"
  );

  // 2. Commands filled -> guided action is "rules"
  assert.equal(
    getGuidedStep({
      startup: "python manage.py runserver",
      test: "pytest",
      hasRules: false,
      rulesOutOfDate: false,
      isVerified: false,
      isPushed: false,
    }),
    "rules"
  );

  // 3. Rules generated -> guided action is "verify"
  assert.equal(
    getGuidedStep({
      startup: "python manage.py runserver",
      test: "pytest",
      hasRules: true,
      rulesOutOfDate: false,
      isVerified: false,
      isPushed: false,
    }),
    "verify"
  );

  // 4. Verification completed -> guided action is "push"
  assert.equal(
    getGuidedStep({
      startup: "python manage.py runserver",
      test: "pytest",
      hasRules: true,
      rulesOutOfDate: false,
      isVerified: true,
      isPushed: false,
    }),
    "push"
  );

  // 5. Rules pushed -> guided action is "publish" (BottomBar publish button)
  assert.equal(
    getGuidedStep({
      startup: "python manage.py runserver",
      test: "pytest",
      hasRules: true,
      rulesOutOfDate: false,
      isVerified: true,
      isPushed: true,
    }),
    "publish"
  );
});
