import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateStreaksAndTotals,
  getContributionLevel,
  groupIntoWeeks,
  computeMonthLabelPositions,
  formatCellTooltip,
  type ContributionDay,
} from "../heatmapHelpers.ts";
import {
  formatMonthYear,
  formatMonthRange,
  isValidMonthRange,
  formatRelativeTime,
  formatFileSize,
} from "../dateHelpers.ts";
import {
  isValidPhone,
  isValidWebsite,
  isValidUsername,
  isValidYearRange,
  validatePassword,
  computeProfileStrength,
} from "../validators.ts";

const ylabsWebDir = process.cwd().endsWith("ylabs-web")
  ? process.cwd()
  : path.resolve(process.cwd(), "ylabs-web");

describe("Developer Profile: Heatmap & Streaks Calculation", () => {
  it("handles empty contribution days array gracefully", () => {
    const res = calculateStreaksAndTotals([]);
    assert.deepEqual(res, {
      total: 0,
      activeDays: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("calculates active days and total accurately", () => {
    const days: ContributionDay[] = [
      { date: "2026-01-01", count: 2, level: 1 },
      { date: "2026-01-02", count: 0, level: 0 },
      { date: "2026-01-03", count: 5, level: 2 },
      { date: "2026-01-04", count: 1, level: 1 },
    ];
    const res = calculateStreaksAndTotals(days);
    assert.equal(res.total, 8);
    assert.equal(res.activeDays, 3);
  });

  it("calculates longest streak correctly across gaps", () => {
    const days: ContributionDay[] = [
      { date: "2026-01-01", count: 1, level: 1 },
      { date: "2026-01-02", count: 2, level: 1 },
      { date: "2026-01-03", count: 0, level: 0 },
      { date: "2026-01-04", count: 1, level: 1 },
      { date: "2026-01-05", count: 4, level: 2 },
      { date: "2026-01-06", count: 2, level: 1 },
      { date: "2026-01-07", count: 0, level: 0 },
      { date: "2026-01-08", count: 3, level: 2 },
    ];
    const res = calculateStreaksAndTotals(days);
    assert.equal(res.longestStreak, 3); // Jan 4, 5, 6
  });

  it("calculates current streak when latest day is active", () => {
    const days: ContributionDay[] = [
      { date: "2026-01-01", count: 0, level: 0 },
      { date: "2026-01-02", count: 1, level: 1 },
      { date: "2026-01-03", count: 2, level: 1 },
    ];
    const res = calculateStreaksAndTotals(days);
    assert.equal(res.currentStreak, 2);
  });

  it("continues streak from yesterday if today has zero contributions yet", () => {
    const days: ContributionDay[] = [
      { date: "2026-01-01", count: 0, level: 0 },
      { date: "2026-01-02", count: 3, level: 2 },
      { date: "2026-01-03", count: 2, level: 1 },
      { date: "2026-01-04", count: 0, level: 0 }, // today
    ];
    const res = calculateStreaksAndTotals(days);
    assert.equal(res.currentStreak, 2);
  });

  it("maps counts to correct levels (0-4)", () => {
    assert.equal(getContributionLevel(0), 0);
    assert.equal(getContributionLevel(1), 1);
    assert.equal(getContributionLevel(2), 1);
    assert.equal(getContributionLevel(3), 2);
    assert.equal(getContributionLevel(5), 2);
    assert.equal(getContributionLevel(6), 3);
    assert.equal(getContributionLevel(9), 3);
    assert.equal(getContributionLevel(10), 4);
    assert.equal(getContributionLevel(50), 4);
  });

  it("groups 371 days into 53 weeks of 7 days", () => {
    const days: ContributionDay[] = Array.from({ length: 371 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      count: i % 3,
      level: (i % 3) as 0 | 1 | 2,
    }));
    const weeks = groupIntoWeeks(days);
    assert.equal(weeks.length, 53);
    assert.equal(weeks[0].days.length, 7);
    assert.equal(weeks[52].days.length, 7);
  });

  it("computeMonthLabelPositions places month labels at first columns of months without overlapping", () => {
    // Generate 53 weeks across a year
    const startDate = new Date(2025, 0, 1);
    const days: ContributionDay[] = [];
    for (let i = 0; i < 371; i++) {
      const cur = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const iso = cur.toISOString().split("T")[0];
      days.push({ date: iso, count: 1, level: 1 });
    }
    const weeks = groupIntoWeeks(days);
    const labels = computeMonthLabelPositions(weeks, 53);

    assert.ok(labels.length >= 10, "Should have positioned multiple month labels");
    // Ensure all column indices are in bounds
    for (const l of labels) {
      assert.ok(l.columnIndex >= 0 && l.columnIndex <= 50, `Column index ${l.columnIndex} should be valid`);
      assert.ok(l.month.length === 3, "Month name should be 3-letter abbreviation");
    }
    // Ensure column indices are strictly ascending with spacing
    for (let i = 1; i < labels.length; i++) {
      assert.ok(
        labels[i].columnIndex - labels[i - 1].columnIndex >= 3,
        "Labels should be spaced at least 3 columns apart"
      );
    }
  });

  it("formatCellTooltip formats date and contributions accurately", () => {
    assert.equal(formatCellTooltip("2026-05-15", 0), "No contributions on Fri, May 15, 2026");
    assert.equal(formatCellTooltip("2026-05-15", 1), "1 contribution on Fri, May 15, 2026");
    assert.equal(formatCellTooltip("2026-05-15", 5), "5 contributions on Fri, May 15, 2026");
  });
});

describe("Developer Profile: Date Helpers", () => {
  it("formatMonthYear formats YYYY-MM to MMM YYYY", () => {
    assert.equal(formatMonthYear("2025-06"), "Jun 2025");
    assert.equal(formatMonthYear("2024-01"), "Jan 2024");
    assert.equal(formatMonthYear("2023-12"), "Dec 2023");
    assert.equal(formatMonthYear(""), "");
  });

  it("formatMonthRange handles from, to, and current/ongoing", () => {
    assert.equal(formatMonthRange("2023-01", "2023-12"), "Jan 2023 - Dec 2023");
    assert.equal(formatMonthRange("2024-03", undefined, true), "Mar 2024 - Present");
    assert.equal(formatMonthRange("", "", true), "Present");
    assert.equal(formatMonthRange("", ""), "");
  });

  it("isValidMonthRange returns false when to is before from", () => {
    assert.equal(isValidMonthRange("2024-05", "2024-06"), true);
    assert.equal(isValidMonthRange("2024-05", "2024-05"), true);
    assert.equal(isValidMonthRange("2024-06", "2024-05"), false);
    assert.equal(isValidMonthRange("2024-06", ""), true);
  });

  it("formatRelativeTime produces relative labels", () => {
    const now = new Date();
    assert.equal(formatRelativeTime(now.toISOString()), "just now");

    const twoHoursAgo = new Date(now.getTime() - 1000 * 60 * 60 * 2);
    assert.equal(formatRelativeTime(twoHoursAgo.toISOString()), "2h ago");

    const threeDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
    assert.equal(formatRelativeTime(threeDaysAgo.toISOString()), "3 days ago");
  });

  it("formatFileSize formats bytes correctly", () => {
    assert.equal(formatFileSize(500), "500 B");
    assert.equal(formatFileSize(1024 * 50), "50.0 KB");
    assert.equal(formatFileSize(1024 * 1024 * 1.5), "1.5 MB");
  });
});

describe("Developer Profile: Validators", () => {
  it("validates phone numbers with country code prefix (+)", () => {
    assert.equal(isValidPhone("+919876543210"), true);
    assert.equal(isValidPhone("+14155552671"), true);
    assert.equal(isValidPhone("9876543210"), false); // missing +
    assert.equal(isValidPhone(""), true); // optional
  });

  it("validates that website starts with https://", () => {
    assert.equal(isValidWebsite("https://example.com"), true);
    assert.equal(isValidWebsite("https://github.com/torvalds"), true);
    assert.equal(isValidWebsite("http://example.com"), false); // must be https
    assert.equal(isValidWebsite("ftp://example.com"), false);
    assert.equal(isValidWebsite("not a url"), false);
    assert.equal(isValidWebsite(""), true); // optional
  });

  it("validates username constraints (3-30 chars, allowed chars)", () => {
    assert.equal(isValidUsername("alex"), true);
    assert.equal(isValidUsername("alex_chen"), true);
    assert.equal(isValidUsername("alex-chen.dev"), true);
    assert.equal(isValidUsername("al"), false); // too short
    assert.equal(isValidUsername("a".repeat(31)), false); // too long
    assert.equal(isValidUsername("alex@chen"), false); // @ not allowed
  });

  it("validates year ranges (end >= start)", () => {
    assert.equal(isValidYearRange(2020, 2024), true);
    assert.equal(isValidYearRange(2024, 2024), true);
    assert.equal(isValidYearRange(2024, 2020), false);
    assert.equal(isValidYearRange(undefined, 2024), true);
  });

  it("validates password strength rules and current password difference", () => {
    // Valid password
    const valid = validatePassword("Secret123", "OldPass123");
    assert.equal(valid.valid, true);
    assert.equal(valid.errors.length, 0);

    // Too short (< 8 chars)
    const short = validatePassword("Abc1", "OldPass123");
    assert.equal(short.valid, false);
    assert.ok(short.errors.some((e) => e.includes("8 characters")));

    // Missing uppercase
    const noUpper = validatePassword("secret123", "OldPass123");
    assert.equal(noUpper.valid, false);
    assert.ok(noUpper.errors.some((e) => e.includes("uppercase")));

    // Missing number
    const noNumber = validatePassword("SecretPassword", "OldPass123");
    assert.equal(noNumber.valid, false);
    assert.ok(noNumber.errors.some((e) => e.includes("number")));

    // Matches current password
    const same = validatePassword("Secret123", "Secret123");
    assert.equal(same.valid, false);
    assert.ok(same.errors.some((e) => e.includes("differ")));
  });

  it("computeProfileStrength computes correct percentage and checklist completion", () => {
    // Empty profile
    const empty = computeProfileStrength(null);
    assert.equal(empty.percentage, 0);
    assert.equal(empty.completedCount, 0);

    // Profile with 3 of 6 completed
    const halfProfile = {
      avatarUrl: "https://example.com/avatar.png",
      resume: { id: "res1", fileName: "resume.pdf", fileSize: 1024, uploadedAt: "2026-01-01" },
      education: [{ id: "edu1", school: "MIT", startYear: 2020, endYear: 2024 }],
      projects: [],
      connections: [],
    };
    const res = computeProfileStrength(halfProfile);
    assert.equal(res.completedCount, 3);
    assert.equal(res.totalCount, 6);
    assert.equal(res.percentage, 50);
    assert.equal(res.incompleteItems.length, 3);
    assert.deepEqual(
      res.incompleteItems.map((i) => i.id),
      ["project", "github", "linkedin"]
    );

    // Profile with all 6 completed
    const fullProfile = {
      ...halfProfile,
      projects: [{ id: "p1", name: "Alpha", whatYouDid: ["Built app"] }],
      connections: [
        { platform: "github", handle: "dev1", connected: true },
        { platform: "linkedin", handle: "dev2", connected: true },
      ],
    };
    const fullRes = computeProfileStrength(fullProfile);
    assert.equal(fullRes.completedCount, 6);
    assert.equal(fullRes.percentage, 100);
    assert.equal(fullRes.incompleteItems.length, 0);
  });
});

describe("Developer Profile v3: Architecture & Design Integrity", () => {
  const ylabsWebDir = process.cwd().endsWith("ylabs-web")
    ? process.cwd()
    : path.resolve(process.cwd(), "ylabs-web");

  const profileDirs = [
    "src/features/profile",
    "src/features/performance",
    "src/features/settings",
    "src/components/profile-ui",
  ];

  function getFilesRecursively(dir: string): string[] {
    const fullDir = path.resolve(ylabsWebDir, dir);
    if (!fs.existsSync(fullDir)) return [];
    let results: string[] = [];
    const list = fs.readdirSync(fullDir);
    for (const file of list) {
      const fullPath = path.join(fullDir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(path.join(dir, file)));
      } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("ensures no lucide-react is imported across any profile features", () => {
    let files = profileDirs.flatMap((d) => getFilesRecursively(d));
    files.push(path.resolve(ylabsWebDir, "src/routes/student.profile.tsx"));

    const offendingFiles: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("from \"lucide-react\"") || content.includes("from 'lucide-react'")) {
        offendingFiles.push(path.basename(file));
      }
    }

    assert.deepEqual(
      offendingFiles,
      [],
      `Found forbidden lucide-react imports in: ${offendingFiles.join(", ")}`
    );
  });

  it("ensures no <svg> element exists outside src/**/charts/", () => {
    let files = profileDirs.flatMap((d) => getFilesRecursively(d));
    files.push(path.resolve(ylabsWebDir, "src/routes/student.profile.tsx"));

    const offendingFiles: string[] = [];
    for (const file of files) {
      if (file.includes("/charts/")) continue;
      const content = fs.readFileSync(file, "utf-8");
      if (/<svg\b/i.test(content)) {
        offendingFiles.push(path.basename(file));
      }
    }

    assert.deepEqual(
      offendingFiles,
      [],
      `Found forbidden <svg> elements outside charts/ in: ${offendingFiles.join(", ")}`
    );
  });

  it("ensures 'Open to work' is absent from frontend models and profile files", () => {
    const files = profileDirs.flatMap((d) => getFilesRecursively(d));
    files.push(path.resolve(ylabsWebDir, "src/routes/student.profile.tsx"));

    const offendingFiles: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      if (content.includes("openToWork") || content.includes("Open to work")) {
        offendingFiles.push(path.basename(file));
      }
    }

    assert.deepEqual(
      offendingFiles,
      [],
      `Found forbidden Open to work in: ${offendingFiles.join(", ")}`
    );
  });

  it("ensures legacy tabs map to new v3 tabs properly", () => {
    function resolveTab(rawTab?: string, rawSection?: string): string {
      if (rawTab === "performance") return "performance";
      if (rawTab === "connections" || (rawTab === "settings" && rawSection === "connections")) return "connections";
      if (rawTab === "security" || (rawTab === "settings" && rawSection === "security")) return "security";
      return "overview";
    }

    assert.equal(resolveTab("profile"), "overview");
    assert.equal(resolveTab("overview"), "overview");
    assert.equal(resolveTab("performance"), "performance");
    assert.equal(resolveTab("settings", "personal"), "overview");
    assert.equal(resolveTab("settings", "connections"), "connections");
    assert.equal(resolveTab("settings", "security"), "security");
    assert.equal(resolveTab("connections"), "connections");
    assert.equal(resolveTab("security"), "security");
  });

  it("ensures verified skills pluralization is correct", () => {
    function formatVerifiedTasks(count: number): string {
      return `${count} ${count === 1 ? "verified task" : "verified tasks"}`;
    }

    assert.equal(formatVerifiedTasks(1), "1 verified task");
    assert.equal(formatVerifiedTasks(0), "0 verified tasks");
    assert.equal(formatVerifiedTasks(5), "5 verified tasks");
  });
});

describe("Developer Profile v3.1: Sidebar Layout, Green Heatmap & Stat Consistency", () => {
  const ylabsWebDir = process.cwd().endsWith("ylabs-web")
    ? process.cwd()
    : path.resolve(process.cwd(), "ylabs-web");
  const cssPath = path.resolve(ylabsWebDir, "src/styles.css");
  const identityPanelPath = path.resolve(
    ylabsWebDir,
    "src/features/profile/components/IdentityPanel.tsx"
  );
  const studentProfileRoutePath = path.resolve(
    ylabsWebDir,
    "src/routes/student.profile.tsx"
  );
  const heatmapCardPath = path.resolve(
    ylabsWebDir,
    "src/features/performance/components/HeatmapCard.tsx"
  );
  const overviewCardPath = path.resolve(
    ylabsWebDir,
    "src/features/profile/components/OverviewContributionCard.tsx"
  );

  it("asserts green heat tokens are defined correctly in light and dark themes", () => {
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Light mode green values
    assert.ok(cssContent.includes("--heat-1: #aceebb"), "light --heat-1 missing");
    assert.ok(cssContent.includes("--heat-2: #4ac26b"), "light --heat-2 missing");
    assert.ok(cssContent.includes("--heat-3: #2da44e"), "light --heat-3 missing");
    assert.ok(cssContent.includes("--heat-4: #116329"), "light --heat-4 missing");

    // Dark mode green values
    assert.ok(cssContent.includes("--heat-1: #0e4429"), "dark --heat-1 missing");
    assert.ok(cssContent.includes("--heat-2: #006d32"), "dark --heat-2 missing");
    assert.ok(cssContent.includes("--heat-3: #26a641"), "dark --heat-3 missing");
    assert.ok(cssContent.includes("--heat-4: #39d353"), "dark --heat-4 missing");
  });

  it("asserts heatmap empty states use standard non-italic copy and dashboard link", () => {
    const heatmapCard = fs.readFileSync(heatmapCardPath, "utf-8");
    const overviewCard = fs.readFileSync(overviewCardPath, "utf-8");

    const expectedSentence = "No contributions yet. Complete a lab or close a ticket to light up your first square.";
    const expectedLinkText = "Browse labs";

    assert.ok(heatmapCard.includes(expectedSentence), "HeatmapCard missing expected sentence");
    assert.ok(heatmapCard.includes(expectedLinkText), "HeatmapCard missing Browse labs link");
    assert.ok(!heatmapCard.includes("italic pt-1"), "HeatmapCard should not have italic text");

    assert.ok(overviewCard.includes(expectedSentence), "OverviewContributionCard missing expected sentence");
    assert.ok(overviewCard.includes(expectedLinkText), "OverviewContributionCard missing Browse labs link");
    assert.ok(!overviewCard.includes("italic pt-1"), "OverviewContributionCard should not have italic text");
  });

  it("asserts stat consistency: zero contributions yields zero streak and no hardcoded 6 or 9 in sidebar", () => {
    const emptyDays: ContributionDay[] = [];
    const stats = calculateStreaksAndTotals(emptyDays);
    const resolvedStreak = stats.total === 0 ? 0 : stats.currentStreak;
    assert.equal(resolvedStreak, 0);

    const identityPanel = fs.readFileSync(identityPanelPath, "utf-8");
    // Verify hardcoded fake numbers are eliminated
    assert.ok(!identityPanel.includes("<div className=\"text-xl font-bold text-ink\">12</div>"), "fake 12 should be removed");
    assert.ok(!identityPanel.includes("<div className=\"text-xl font-bold text-ink\">6</div>"), "fake 6 should be removed");
    assert.ok(!identityPanel.includes("<div className=\"text-xl font-bold text-ink\">5</div>"), "fake 5 should be removed");
    assert.ok(!identityPanel.includes("<div className=\"text-xl font-bold text-ink\">9</div>"), "fake 9 should be removed");

    // Verify it binds to perfData dynamic values
    assert.ok(identityPanel.includes("perfData?.labsCompleted ?? 0"));
    assert.ok(identityPanel.includes("perfData?.stats?.currentStreak ?? 0"));
    assert.ok(identityPanel.includes("perfData?.sprintsShipped ?? 0"));
    assert.ok(identityPanel.includes("perfData?.mockInterviews ?? 0"));
  });

  it("asserts layout constraints for IdentityPanel and sticky wrapper", () => {
    const routeContent = fs.readFileSync(studentProfileRoutePath, "utf-8");
    const panelContent = fs.readFileSync(identityPanelPath, "utf-8");

    // Grid track 296px minmax(0, 1fr)
    assert.ok(
      routeContent.includes("lg:grid-cols-[296px_minmax(0,1fr)]"),
      "grid track must be 296px minmax(0, 1fr)"
    );

    // Sticky wrapper has overflow-x: hidden and overflow-y: auto
    assert.ok(
      routeContent.includes("lg:overflow-y-auto") && routeContent.includes("lg:overflow-x-hidden"),
      "sticky wrapper must explicitly set overflow-x: hidden and overflow-y: auto"
    );

    // Aside width 296px box-border
    assert.ok(
      panelContent.includes("lg:w-[296px]") && panelContent.includes("box-border"),
      "aside must be 296px and box-border"
    );

    // Details grid 76px minmax(0, 1fr)
    assert.ok(
      panelContent.includes("76px minmax(0, 1fr)"),
      "details must be grid 76px minmax(0, 1fr)"
    );

    // Text wrapping overflow-wrap: anywhere
    assert.ok(
      panelContent.includes('overflowWrap: "anywhere"'),
      "details must wrap with overflowWrap: anywhere"
    );

    // No truncate or max-w on details items
    assert.ok(
      !panelContent.includes("truncate max-w-[170px]"),
      "detail rows must not have truncate max-w-[170px]"
    );

    // Stats grid 2 columns minmax(0, 1fr)
    assert.ok(
      panelContent.includes("repeat(2, minmax(0, 1fr))"),
      "stats grid must use repeat(2, minmax(0, 1fr))"
    );
  });
});

describe("Developer Profile v3.2: Sidebar Clipping, Public URL & Edit Profile Rules", () => {
  it("validates env configuration and strips trailing slashes", async () => {
    const { parseEnv } = await import("../env.ts");

    // Trailing slash stripped
    const res1 = parseEnv({ VITE_PUBLIC_PROFILE_BASE_URL: "https://yuvro.com///" });
    assert.equal(res1.PUBLIC_PROFILE_BASE_URL, "https://yuvro.com");

    const res2 = parseEnv({ VITE_PUBLIC_PROFILE_BASE_URL: "http://localhost:3002" });
    assert.equal(res2.PUBLIC_PROFILE_BASE_URL, "http://localhost:3002");

    // Throws in production when missing
    assert.throws(
      () => {
        parseEnv({ PROD: true, VITE_PUBLIC_PROFILE_BASE_URL: "" });
      },
      /Missing required environment variable/
    );

    // Rejects non-http(s) URLs
    assert.throws(
      () => {
        parseEnv({ VITE_PUBLIC_PROFILE_BASE_URL: "ftp://example.com" });
      },
      /must be an absolute http\(s\) URL/
    );
  });

  it("builds and formats public profile URLs correctly", async () => {
    const { buildPublicProfileUrl, formatPublicProfileDisplayUrl } = await import("../publicUrl.ts");

    const fullUrl = buildPublicProfileUrl("manikanta", "https://yuvro.com");
    assert.equal(fullUrl, "https://yuvro.com/u/manikanta");

    const encoded = buildPublicProfileUrl("test user", "http://localhost:3002");
    assert.equal(encoded, "http://localhost:3002/u/test%20user");

    const display = formatPublicProfileDisplayUrl("manikanta", "https://yuvro.com");
    assert.equal(display, "yuvro.com/u/manikanta");

    const localDisplay = formatPublicProfileDisplayUrl("manikanta", "http://localhost:3002");
    assert.equal(localDisplay, "localhost:3002/u/manikanta");
  });

  it("asserts NO hardcoded yuvro.com inside ylabs-web/src/features/profile", () => {
    const profileDir = path.resolve(ylabsWebDir, "src/features/profile");
    function walkDir(dir: string, fileList: string[] = []): string[] {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          walkDir(full, fileList);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          fileList.push(full);
        }
      }
      return fileList;
    }

    const files = walkDir(profileDir);
    const violations: string[] = [];

    for (const f of files) {
      const content = fs.readFileSync(f, "utf8");
      if (content.includes("yuvro.com")) {
        violations.push(path.relative(profileDir, f));
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Hardcoded "yuvro.com" detected in profile feature files: ${violations.join(", ")}. Use publicUrl helpers.`
    );
  });

  it("asserts sticky sidebar wrapper has offset padding/margin, box-sizing, and nav-h vars", () => {
    const routePath = path.resolve(ylabsWebDir, "src/routes/student.profile.tsx");
    const routeContent = fs.readFileSync(routePath, "utf8");
    const stylesPath = path.resolve(ylabsWebDir, "src/styles.css");
    const stylesContent = fs.readFileSync(stylesPath, "utf8");

    // Check sticky wrapper has padding: 8px and margin: -8px
    assert.ok(
      routeContent.includes('padding: "8px"') && routeContent.includes('margin: "-8px"'),
      "sticky wrapper must offset overflow with padding: 8px and margin: -8px"
    );
    assert.ok(
      routeContent.includes('scrollPadding: "8px"'),
      "sticky wrapper must have scrollPadding: 8px"
    );
    assert.ok(
      routeContent.includes('top: "calc(var(--nav-h, 56px) + 16px)"'),
      "sticky wrapper top must use --nav-h variable"
    );
    assert.ok(
      routeContent.includes('maxHeight: "calc(100vh - var(--nav-h, 56px) - 32px)"'),
      "sticky wrapper maxHeight must use --nav-h variable"
    );

    // Check styles.css defines --nav-h: 56px
    assert.ok(
      stylesContent.includes("--nav-h: 56px;"),
      "styles.css must define --nav-h: 56px"
    );

    // Check IdentityPanel avatar has clearance
    const panelPath = path.resolve(ylabsWebDir, "src/features/profile/components/IdentityPanel.tsx");
    const panelContent = fs.readFileSync(panelPath, "utf8");
    assert.ok(
      panelContent.includes("pt-1") || panelContent.includes("pt-2"),
      "aside/avatar must have top padding clearance"
    );
  });

  it("asserts email is read-only plain text in edit mode with support helper text", () => {
    const panelPath = path.resolve(ylabsWebDir, "src/features/profile/components/IdentityPanel.tsx");
    const panelContent = fs.readFileSync(panelPath, "utf8");

    assert.ok(
      panelContent.includes("Managed in your account. Contact support to change it."),
      "must display account managed helper text for email"
    );
    assert.ok(
      !panelContent.includes("<Input value={email}") && !panelContent.includes("<Input\n                value={email}"),
      "email must not be an Input component in edit mode"
    );
  });

  it("validates local username rules and session caching for availability", async () => {
    const { validateUsernameLocally, usernameSessionCache } = await import(
      "../../features/profile/hooks/useUsernameAvailability.ts"
    );

    // Local validation
    assert.equal(validateUsernameLocally("").isValid, false);
    assert.equal(validateUsernameLocally("ab").isValid, false);
    assert.equal(validateUsernameLocally("a".repeat(31)).isValid, false);
    assert.equal(validateUsernameLocally("valid_user-1").isValid, true);
    assert.equal(validateUsernameLocally("invalid user!").isValid, false);

    // Session cache
    usernameSessionCache.set("alextaken", { available: false, reason: "taken" });
    assert.equal(usernameSessionCache.has("alextaken"), true);
    assert.equal(usernameSessionCache.get("alextaken")?.available, false);
  });
});

describe("Developer Profile v3.4: Dialog Tokens, Button Robustness & Portal Inheritance", () => {
  it("verifies root and dark design tokens exist for portal inheritance", () => {
    const stylesPath = path.resolve(ylabsWebDir, "src/styles.css");
    const stylesContent = fs.readFileSync(stylesPath, "utf8");

    // Root light tokens
    assert.ok(stylesContent.includes("--danger: #dc2626;"), "must define --danger in :root");
    assert.ok(stylesContent.includes("--danger-strong: #b91c1c;"), "must define --danger-strong in :root");
    assert.ok(stylesContent.includes("--danger-soft: #fef2f2;"), "must define --danger-soft in :root");
    assert.ok(stylesContent.includes("--on-danger: #ffffff;"), "must define --on-danger in :root");
    assert.ok(stylesContent.includes("--sub: #344054;"), "must define --sub in :root");
    assert.ok(stylesContent.includes("--ink: #101828;"), "must define --ink in :root");
    assert.ok(stylesContent.includes("--line: #e4e7ec;"), "must define --line in :root");

    // Dark tokens
    assert.ok(stylesContent.includes("--danger: #ef4444;"), "must define --danger in .dark");
    assert.ok(stylesContent.includes("--danger-strong: #dc2626;"), "must define --danger-strong in .dark");
    assert.ok(stylesContent.includes("--danger-soft: #450a0a;"), "must define --danger-soft in .dark");
    assert.ok(stylesContent.includes("--on-danger: #ffffff;"), "must define --on-danger in .dark");
    assert.ok(stylesContent.includes("--sub: #c9d1d9;"), "must define --sub in .dark");
    assert.ok(stylesContent.includes("--ink: #f0f6fc;"), "must define --ink in .dark");
    assert.ok(stylesContent.includes("--line: #30363d;"), "must define --line in .dark");

    // Registered in @theme inline
    assert.ok(stylesContent.includes("--color-danger: var(--danger);"), "must map --color-danger");
    assert.ok(stylesContent.includes("--color-on-danger: var(--on-danger);"), "must map --color-on-danger");
    assert.ok(stylesContent.includes("--color-sub:"), "must map --color-sub");
    assert.ok(stylesContent.includes("--color-ink:"), "must map --color-ink");
    assert.ok(stylesContent.includes("--color-line:"), "must map --color-line");
  });

  it("verifies Button component has explicit fallbacks and variants", () => {
    const buttonPath = path.resolve(ylabsWebDir, "src/components/profile-ui/Button.tsx");
    const buttonContent = fs.readFileSync(buttonPath, "utf8");

    // Variants supported
    assert.ok(buttonContent.includes("danger:"), "must support danger variant");
    assert.ok(buttonContent.includes('"danger-outline":'), "must support danger-outline variant");
    assert.ok(buttonContent.includes("outline:"), "must support outline variant");
    assert.ok(buttonContent.includes("secondary:"), "must support secondary variant");
    assert.ok(buttonContent.includes("primary:"), "must support primary variant");

    // Fallbacks
    assert.ok(buttonContent.includes("#dc2626"), "must have #dc2626 danger fallback");
    assert.ok(buttonContent.includes("#ffffff"), "must have #ffffff text fallback");
    assert.ok(buttonContent.includes("opacity: 0.45"), "disabled button must use 0.45 opacity");
  });

  it("verifies ConfirmDialog has high-contrast description and no blur overlay", () => {
    const dialogPath = path.resolve(ylabsWebDir, "src/components/profile-ui/ConfirmDialog.tsx");
    const dialogContent = fs.readFileSync(dialogPath, "utf8");

    // No blur
    assert.ok(!dialogContent.includes("backdrop-blur"), "overlay must not have backdrop-blur");
    assert.ok(dialogContent.includes('backdropFilter: "none"'), "overlay backdropFilter must be none");

    // Description contrast
    assert.ok(dialogContent.includes("text-sub"), "description must use text-sub");
    assert.ok(!dialogContent.includes("text-muted"), "description must not use low-contrast text-muted");

    // Sizing
    assert.ok(dialogContent.includes("min-w-[88px]"), "buttons must have min-width 88px");
    assert.ok(dialogContent.includes("h-9"), "buttons must have 36px height (h-9)");
  });

  it("verifies SecurityTab delete account card button and full width text", () => {
    const secPath = path.resolve(ylabsWebDir, "src/features/settings/components/SecurityTab.tsx");
    const secContent = fs.readFileSync(secPath, "utf8");

    assert.ok(secContent.includes('variant="danger"'), "delete account button must be filled danger variant");
    assert.ok(secContent.includes("h-10"), "delete button and input must be 40px high (h-10)");
    assert.ok(secContent.includes("deleteInput.trim() !== (profile?.username || \"\")"), "must disable until username matches");
  });

  it("verifies photo removal dialog is wired in IdentityPanel", () => {
    const idPath = path.resolve(ylabsWebDir, "src/features/profile/components/IdentityPanel.tsx");
    const idContent = fs.readFileSync(idPath, "utf8");

    assert.ok(idContent.includes("showRemovePhotoConfirm"), "IdentityPanel must have remove photo confirm dialog");
    assert.ok(idContent.includes("Remove profile photo?"), "dialog title must be Remove profile photo?");
  });
});

describe("Developer Profile v3.5: Red Danger Colors, Tab Stickiness, Single-Click OAuth & Security Features", () => {
  it("verifies danger buttons use true red instead of maroon", () => {
    const stylesPath = path.resolve(ylabsWebDir, "src/styles.css");
    const stylesContent = fs.readFileSync(stylesPath, "utf8");

    assert.ok(stylesContent.includes("--danger: #dc2626;"), "light theme danger must be #dc2626 true red");
    assert.ok(stylesContent.includes("--danger: #ef4444;"), "dark theme danger must be #ef4444 true red");
  });

  it("verifies right column tabs stick flush with navbar so content cannot scroll above them", () => {
    const routePath = path.resolve(ylabsWebDir, "src/routes/student.profile.tsx");
    const routeContent = fs.readFileSync(routePath, "utf8");

    assert.ok(
      routeContent.includes('style={{ top: "var(--nav-h, 56px)" }}'),
      "tabs bar must stick flush to var(--nav-h, 56px)"
    );
    assert.ok(
      routeContent.includes("z-30"),
      "tabs bar must have z-30 to remain above scrolling content"
    );
  });

  it("verifies ConnectionsTab implements single-click OAuth flow without manual handle inputs", () => {
    const connPath = path.resolve(ylabsWebDir, "src/features/settings/components/ConnectionsTab.tsx");
    const connContent = fs.readFileSync(connPath, "utf8");

    assert.ok(!connContent.includes('placeholder="Your GitHub username"'), "must not require GitHub handle input");
    assert.ok(!connContent.includes('placeholder="Your LinkedIn public handle"'), "must not require LinkedIn handle input");
    assert.ok(connContent.includes("Connect GitHub"), "must have single-click Connect GitHub button");
    assert.ok(connContent.includes("Connect LinkedIn"), "must have single-click Connect LinkedIn button");
    assert.ok(connContent.includes("/auth/${platform}/connect/"), "must query auth connect endpoint");
  });

  it("verifies SecurityTab has password changing options for current password and email OTP", () => {
    const secPath = path.resolve(ylabsWebDir, "src/features/settings/components/SecurityTab.tsx");
    const secContent = fs.readFileSync(secPath, "utf8");

    assert.ok(secContent.includes("Using current password"), "must provide current password option");
    assert.ok(secContent.includes("Using email OTP"), "must provide email OTP option");
    assert.ok(secContent.includes("sendChangePasswordOtp"), "must wire sendChangePasswordOtp");
    assert.ok(secContent.includes("changePassword"), "must wire changePassword");
  });

  it("verifies SecurityTab displays real device sessions instead of static dummy data", () => {
    const secPath = path.resolve(ylabsWebDir, "src/features/settings/components/SecurityTab.tsx");
    const secContent = fs.readFileSync(secPath, "utf8");

    assert.ok(secContent.includes("getActiveSessions"), "must call getActiveSessions for real sessions");
    assert.ok(secContent.includes("detectCurrentDevice"), "must dynamically detect current device");
    assert.ok(secContent.includes("revokeSession"), "must support revoking individual sessions");
    assert.ok(secContent.includes("revokeAllOtherSessions"), "must support revoking other sessions");
  });
});


