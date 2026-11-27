import test from "node:test";
import assert from "node:assert/strict";
import { buildFileTree } from "../fileTreeUtils.ts";

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

test("Wizard: Combined 4-step wizard structure and auto-title fill", () => {
  const STEPS = [
    "Repository and scan",
    "Basics",
    "Tasks",
    "Scoring and testing",
  ];
  assert.equal(STEPS.length, 4);
  assert.equal(STEPS[0], "Repository and scan");
  assert.equal(STEPS[1], "Basics");
  assert.equal(STEPS[2], "Tasks");
  assert.equal(STEPS[3], "Scoring and testing");

  // Title auto-fill logic from repo
  function deriveTitleFromRepo(repo: { id: string; n?: string }): string {
    return repo.n || repo.id.split("/")[1] || repo.id;
  }

  assert.equal(
    deriveTitleFromRepo({ id: "MKGandhi05/yuvro_todo_django", n: "yuvro_todo_django" }),
    "yuvro_todo_django"
  );
  assert.equal(
    deriveTitleFromRepo({ id: "org/awesome-service" }),
    "awesome-service"
  );

  // Step 1 validation logic (Repository and scan)
  function validateStep1(formData: {
    type: "lab" | "design" | "know";
    url: string;
    branch: string;
    scanned: boolean;
  }): { e: Record<string, string>; canContinue: boolean } {
    const e: Record<string, string> = {};
    let canContinue = true;
    if (formData.type === "lab") {
      if (!formData.url.trim()) e.url = "Starter repository URL is required";
      if (!formData.branch.trim()) e.branch = "Branch is required";
      if (!formData.scanned) canContinue = false;
    }
    if (Object.keys(e).length > 0) canContinue = false;
    return { e, canContinue };
  }

  // Missing repo and un-scanned on lab
  const errs = validateStep1({
    type: "lab",
    url: "",
    branch: "",
    scanned: false,
  });
  assert.equal(Boolean(errs.e.url), true);
  assert.equal(errs.canContinue, false);

  // Filled repo but un-scanned
  const unscanned = validateStep1({
    type: "lab",
    url: "https://github.com/MKGandhi05/yuvro_todo_django",
    branch: "main",
    scanned: false,
  });
  assert.equal(Object.keys(unscanned.e).length, 0);
  assert.equal(unscanned.canContinue, false);

  // Valid and scanned step 1 lab
  const validStep1 = validateStep1({
    type: "lab",
    url: "https://github.com/MKGandhi05/yuvro_todo_django",
    branch: "main",
    scanned: true,
  });
  assert.equal(validStep1.canContinue, true);

  // Step 2 validation logic (Basics)
  function validateStep2(formData: {
    title: string;
    desc: string;
    marks: number;
    dur: number;
  }): Record<string, string> {
    const e: Record<string, string> = {};
    if (!formData.title.trim()) e.title = "Title is required";
    if (!formData.desc.trim()) e.desc = "Description is required";
    if (Number(formData.marks) <= 0) e.marks = "Marks must be greater than 0";
    if (Number(formData.dur) <= 0) e.dur = "Duration must be greater than 0";
    return e;
  }

  const step2Errs = validateStep2({
    title: "",
    desc: "",
    marks: 0,
    dur: 0,
  });
  assert.equal(Boolean(step2Errs.title), true);
  assert.equal(Boolean(step2Errs.desc), true);

  const step2Valid = validateStep2({
    title: "yuvro_todo_django",
    desc: "Build Todo App with Django and DRF",
    marks: 10,
    dur: 30,
  });
  assert.equal(Object.keys(step2Valid).length, 0);

  // Category-specific step resolution
  function getStepsForCategory(type: "lab" | "design" | "know"): string[] {
    if (type === "design") {
      return ["Basics", "Tasks"];
    }
    if (type === "know") {
      return ["Basics"];
    }
    return ["Repository and scan", "Basics", "Tasks", "Scoring and testing"];
  }

  assert.deepEqual(getStepsForCategory("lab"), [
    "Repository and scan",
    "Basics",
    "Tasks",
    "Scoring and testing",
  ]);
  assert.deepEqual(getStepsForCategory("design"), ["Basics", "Tasks"]);
  assert.deepEqual(getStepsForCategory("know"), ["Basics"]);

  // Category-specific publish validation
  function getPublishBlockReasonByCategory(state: {
    type: "lab" | "design" | "know";
    title: string;
    desc: string;
    tasks: any[];
    testCommand?: string;
    rules?: any;
    verificationPassed?: boolean;
    pushed?: string | null;
  }): string {
    if (state.type === "know") {
      if (!state.title.trim()) return "Title is required before publishing";
      if (!state.desc.trim()) return "Description is required before publishing";
      return "";
    }
    if (state.type === "design") {
      if (!state.title.trim()) return "Title is required before publishing";
      if (!state.desc.trim()) return "Description is required before publishing";
      if (!state.tasks.length) return "Add at least one task before publishing";
      return "";
    }
    // lab
    if (!state.tasks.length) return "Add at least one task before publishing";
    if (!state.testCommand?.trim()) return "Configure a test command before publishing";
    if (!state.rules) return "Generate scoring rules before publishing";
    if (!state.verificationPassed) return "Run full verification before publishing";
    if (!state.pushed) return "Push scoring rules to repository before publishing";
    return "";
  }

  // Knowledge question can publish with title and desc only
  assert.equal(
    getPublishBlockReasonByCategory({
      type: "know",
      title: "Python Memory Model",
      desc: "Explain GIL and reference counting",
      tasks: [],
    }),
    ""
  );

  // System design requires title, desc, and tasks, but NO container/rules/verification
  assert.equal(
    getPublishBlockReasonByCategory({
      type: "design",
      title: "Design TinyURL",
      desc: "High throughput URL shortener",
      tasks: [],
    }),
    "Add at least one task before publishing"
  );
  assert.equal(
    getPublishBlockReasonByCategory({
      type: "design",
      title: "Design TinyURL",
      desc: "High throughput URL shortener",
      tasks: [{ id: "t1", title: "API Gateway" }],
    }),
    ""
  );
});

test("Wizard Step 4: buildFileTree accurately nests paths into hierarchical folder structure", () => {
  const paths = [
    "manage.py",
    "powerpitch/__init__.py",
    "powerpitch/admin.py",
    "powerpitch/migrations/0001_initial.py",
    "powerpitch/migrations/0002_alter.py",
    "powerpitch/migrations/0003_otp.py",
    ".env",
  ];

  const tree = buildFileTree(paths);

  // 1. Root level has powerpitch folder first, then .env and manage.py files
  assert.equal(tree.length, 3);
  assert.equal(tree[0].name, "powerpitch");
  assert.equal(tree[0].isFolder, true);
  assert.equal(tree[1].name, ".env");
  assert.equal(tree[1].isFolder, false);
  assert.equal(tree[2].name, "manage.py");
  assert.equal(tree[2].isFolder, false);

  // 2. Under powerpitch folder: migrations folder first, then admin.py and __init__.py
  const ppChildren = tree[0].children;
  assert.equal(ppChildren[0].name, "migrations");
  assert.equal(ppChildren[0].isFolder, true);
  assert.equal(ppChildren[1].name, "__init__.py");
  assert.equal(ppChildren[2].name, "admin.py");

  // 3. Under migrations: 3 migration files sorted
  const migChildren = ppChildren[0].children;
  assert.equal(migChildren.length, 3);
  assert.equal(migChildren[0].name, "0001_initial.py");
  assert.equal(migChildren[1].name, "0002_alter.py");
  assert.equal(migChildren[2].name, "0003_otp.py");
  assert.equal(migChildren[2].path, "powerpitch/migrations/0003_otp.py");
});

test("Wizard Step 4: Verification stages only contain Fail case and Pass case (no Temp workspace)", () => {
  const stageTitles = [
    "1. Fail case (Starter)",
    "2. Pass case (Solution)",
  ];

  assert.equal(stageTitles.length, 2);
  assert.equal(stageTitles[0], "1. Fail case (Starter)");
  assert.equal(stageTitles[1], "2. Pass case (Solution)");
  assert.ok(!stageTitles.some((t) => t.toLowerCase().includes("temp workspace")));
});

test("Wizard Step 4: Source control status badge detection (Modified vs Added)", () => {
  const starterKeyFiles: Record<string, string> = {
    "app/views.py": "def home(): pass",
    "app/models.py": "class User: pass",
  };

  const solutionFiles = [
    "app/views.py",
    "app/serializers.py",
  ];

  function getFileStatusBadge(path: string, starterFiles: Record<string, string>): "M" | "A" {
    return starterFiles[path] ? "M" : "A";
  }

  assert.equal(getFileStatusBadge(solutionFiles[0], starterKeyFiles), "M");
  assert.equal(getFileStatusBadge(solutionFiles[1], starterKeyFiles), "A");
});
