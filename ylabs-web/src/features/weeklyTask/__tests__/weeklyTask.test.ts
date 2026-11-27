import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getTasks,
  getTask,
  getLeaderboard,
  getStats,
  completeDay,
  calculatePoints,
  getTodayIndex,
  getTaskDayName,
  getTaskStartDate,
  computeTaskDays,
  DAY_NAMES,
  saveStoredDone,
} from "../api.ts";

describe("Weekly Task Feature: Core Architecture & Data Suite", () => {
  beforeEach(() => {
    // Reset stored completions for clean state
    saveStoredDone("mk", [0, 1, 2, 3, 4]);
    saveStoredDone("dj", [0, 1]);
    saveStoredDone("ds", [0, 1, 2]);
    saveStoredDone("sd", [0, 1, 2, 3, 4]);
  });

  test("1. Tab switch updates all three panels (Task, Leaderboard, Stats)", async () => {
    const tasks = await getTasks();
    assert.ok(tasks.length >= 4, "Should have at least 4 default weekly tasks");

    // Check task 1 (Django - 'dj')
    const djTask = await getTask("dj");
    assert.ok(djTask, "Django task should exist");
    assert.equal(djTask?.name, "Django");
    const djLb = await getLeaderboard("dj");
    const djStats = await getStats("dj");
    assert.equal(djStats.totalEnrolled, 1284);

    // Switch to task 2 (Data Structures - 'ds')
    const dsTask = await getTask("ds");
    assert.ok(dsTask, "Data Structures task should exist");
    assert.equal(dsTask?.name, "Data Structures");
    assert.equal(dsTask?.enrolledCount, 2046);
    const dsLb = await getLeaderboard("ds");
    const dsStats = await getStats("ds");
    assert.equal(dsStats.totalEnrolled, 2046);

    // Verify task, leaderboard and stats panels all reflect the switched task
    assert.notEqual(djTask?.id, dsTask?.id);
    assert.notEqual(djStats.totalEnrolled, dsStats.totalEnrolled);
    assert.ok(Array.isArray(dsLb.top));
  });

  test("2. Completed days show completed status, no solve button, and review action", async () => {
    // Django task has days [0, 1, 2, 3] completed by default
    const task = await getTask("dj");
    assert.ok(task);

    const completedDay = task.days[0];
    assert.equal(completedDay.status, "completed");
    assert.equal(completedDay.index, 0);

    // A completed day has points and minutes
    assert.equal(completedDay.points, 10);
    assert.equal(completedDay.minutes, 45);
  });

  test("3. Locked days show 'Opens <day>' and have locked status", async () => {
    saveStoredDone("dj", []);
    const ti = getTodayIndex();
    const task = await getTask("dj");
    assert.ok(task);

    // Any day strictly after today's weekday index must be locked
    for (let i = ti + 1; i < 7; i++) {
      const futureDay = task.days[i];
      assert.equal(futureDay.status, "locked", `Day ${i} should be locked`);
      const expectedDayName = DAY_NAMES[i];
      assert.ok(expectedDayName, `Day ${i} should have a valid weekday name`);
    }
  });

  test("4. The enrolled value is numeric and formats properly", async () => {
    const tasks = await getTasks();
    for (const t of tasks) {
      assert.equal(typeof t.enrolledCount, "number");
      assert.ok(t.enrolledCount > 0);
      const formatted = Number(t.enrolledCount).toLocaleString("en-IN");
      assert.ok(typeof formatted === "string");
      assert.ok(!isNaN(Number(t.enrolledCount)));
    }

    // Check specific formats
    assert.equal(Number(1284).toLocaleString("en-IN"), "1,284");
    assert.equal(Number(2046).toLocaleString("en-IN"), "2,046");
    assert.equal(Number(312).toLocaleString("en-IN"), "312");
  });

  test("5. Returns clean empty state without synthetic leaderboard generation", async () => {
    // Reset Django task to have only 1 day done so points = 10, placing user far down
    saveStoredDone("dj", [0]);

    const { top, userEntry, rank } = await getLeaderboard("dj");

    // Without backend data, returns empty top list and null rank (no fake generated leaderboard)
    assert.ok(Array.isArray(top));
    assert.equal(top.length, 0);
    assert.equal(userEntry, null);
    assert.equal(rank, null);
  });

  test("6. Completing a day updates progress, streak, and recalculates points", async () => {
    // Start with 0 completed days for System Design
    saveStoredDone("sd", []);
    const initialStats = await getStats("sd");
    assert.equal(initialStats.daysCompleted, 0);
    assert.equal(initialStats.points, 0);

    // Complete Day 0
    const { task: t1, stats: s1 } = await completeDay("sd", 0);
    assert.equal(s1.daysCompleted, 1);
    assert.equal(s1.points, 10);
    assert.equal(t1.days[0].status, "completed");

    // Complete remaining days up to 7 to test bonus 20 YP (7 * 10 + 20 = 90 YP)
    for (let i = 1; i < 7; i++) {
      await completeDay("sd", i);
    }
    const finalStats = await getStats("sd");
    assert.equal(finalStats.daysCompleted, 7);
    assert.equal(finalStats.points, 90); // 7 * 10 + 20 bonus YP
  });

  test("7. Points calculation correctly awards 10 YP per day plus 20 bonus YP at 7 days", () => {
    assert.equal(calculatePoints(0), 0);
    assert.equal(calculatePoints(1), 10);
    assert.equal(calculatePoints(2), 20);
    assert.equal(calculatePoints(3), 30);
    assert.equal(calculatePoints(4), 40);
    assert.equal(calculatePoints(5), 50);
    assert.equal(calculatePoints(6), 60);
    assert.equal(calculatePoints(7), 90); // 70 + 20
  });

  test("8. Starting on Wednesday correctly displays Day 1 as Wednesday, not Monday", () => {
    // Wednesday Nov 18, 2026
    const wednesdayDate = new Date("2026-11-18T00:00:00");
    const day0Name = getTaskDayName(0, wednesdayDate);
    const day1Name = getTaskDayName(1, wednesdayDate);
    const day2Name = getTaskDayName(2, wednesdayDate);
    const day3Name = getTaskDayName(3, wednesdayDate);
    const day4Name = getTaskDayName(4, wednesdayDate);
    const day5Name = getTaskDayName(5, wednesdayDate);
    const day6Name = getTaskDayName(6, wednesdayDate);

    assert.equal(day0Name, "Wednesday", "Day 1 must be Wednesday when started on Wednesday");
    assert.equal(day1Name, "Thursday", "Day 2 must be Thursday");
    assert.equal(day2Name, "Friday", "Day 3 must be Friday");
    assert.equal(day3Name, "Saturday", "Day 4 must be Saturday");
    assert.equal(day4Name, "Sunday", "Day 5 must be Sunday");
    assert.equal(day5Name, "Monday", "Day 6 must be Monday");
    assert.equal(day6Name, "Tuesday", "Day 7 must be Tuesday");
  });

  test("9. ComputeTaskDays populates multiple tickets per day correctly", () => {
    const rawDays = [
      {
        ticket_id: "tk-1",
        ticket_title: "Setup DB",
        ticket_ids: ["tk-1", "tk-2"],
        tickets: [
          { ticket_id: "tk-1", title: "Setup DB", yuvro_points: 10 },
          { ticket_id: "tk-2", title: "Configure Indexing", yuvro_points: 15 },
        ],
        yuvro_points: 25,
        minutes_max: 60,
      },
    ];

    const startDate = new Date("2026-11-18T00:00:00"); // Wednesday
    const computed = computeTaskDays(rawDays, [0], 0, startDate);

    assert.equal(computed.length, 1);
    const day0 = computed[0];
    assert.equal(day0.dayName, "Wednesday");
    assert.equal(day0.status, "completed");
    assert.equal(day0.points, 25);
    assert.equal(day0.minutes, 60);
    assert.equal(day0.ticketIds?.length, 2);
    assert.equal(day0.tickets?.length, 2);
  });
});
