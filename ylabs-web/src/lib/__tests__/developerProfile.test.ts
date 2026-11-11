import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateStreaksAndTotals,
  getContributionLevel,
  groupIntoWeeks,
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
} from "../validators.ts";

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
});
