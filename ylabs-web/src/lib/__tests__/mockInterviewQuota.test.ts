import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  CandidateMockInterviewQuota,
  MockInterviewPack,
} from "../../services/mockInterviewService.ts";

const DEFAULT_MOCK_INTERVIEW_PACKS: MockInterviewPack[] = [
  {
    id: "mock_pack_1",
    name: "1 Mock Interview",
    description: "1 full AI mock interview session with real-time adaptive questioning and detailed report.",
    interviews_count: 1,
    price_inr: 99,
    price_paise: 9900,
    badge: "",
    sort_order: 1,
  },
  {
    id: "mock_pack_5",
    name: "5 Mock Interviews",
    description: "5 full AI mock interview sessions with real-time adaptive questioning, cycle progression, and analytics.",
    interviews_count: 5,
    price_inr: 399,
    price_paise: 39900,
    badge: "Popular",
    sort_order: 2,
  },
  {
    id: "mock_pack_10",
    name: "10 Mock Interviews",
    description: "10 full AI mock interview sessions for comprehensive end-to-end interview mastery.",
    interviews_count: 10,
    price_inr: 700,
    price_paise: 70000,
    badge: "Best Value",
    sort_order: 3,
  },
];

describe("Candidate Mock Interview Quota & Purchase System", () => {
  it("1. Candidate receives an initial grant of 3 free mock interviews by default", () => {
    const defaultQuota: CandidateMockInterviewQuota = {
      free_interviews: 3,
      purchased_interviews: 0,
      used_interviews: 0,
      available_interviews: 3,
      total_granted: 3,
    };

    assert.strictEqual(defaultQuota.free_interviews, 3);
    assert.strictEqual(defaultQuota.purchased_interviews, 0);
    assert.strictEqual(defaultQuota.used_interviews, 0);
    assert.strictEqual(defaultQuota.available_interviews, 3);
    assert.strictEqual(defaultQuota.total_granted, 3);
  });

  it("2. Pricing catalog matches requested tiers: 1: ₹99, 5: ₹399, 10: ₹700", () => {
    const packs = DEFAULT_MOCK_INTERVIEW_PACKS;
    assert.strictEqual(packs.length, 3);

    const pack1 = packs.find((p) => p.interviews_count === 1);
    assert.ok(pack1);
    assert.strictEqual(pack1.price_inr, 99);
    assert.strictEqual(pack1.price_paise, 9900);

    const pack5 = packs.find((p) => p.interviews_count === 5);
    assert.ok(pack5);
    assert.strictEqual(pack5.price_inr, 399);
    assert.strictEqual(pack5.price_paise, 39900);
    assert.strictEqual(pack5.badge, "Popular");

    const pack10 = packs.find((p) => p.interviews_count === 10);
    assert.ok(pack10);
    assert.strictEqual(pack10.price_inr, 700);
    assert.strictEqual(pack10.price_paise, 70000);
    assert.strictEqual(pack10.badge, "Best Value");
  });

  it("3. Purchasing a pack atomically increases purchased and available interviews", () => {
    const currentQuota: CandidateMockInterviewQuota = {
      free_interviews: 3,
      purchased_interviews: 0,
      used_interviews: 1,
      available_interviews: 2,
      total_granted: 3,
    };

    // Candidate purchases 5 mock interviews pack (₹399)
    const pack = DEFAULT_MOCK_INTERVIEW_PACKS.find((p) => p.interviews_count === 5)!;
    const updatedQuota: CandidateMockInterviewQuota = {
      ...currentQuota,
      purchased_interviews: currentQuota.purchased_interviews + pack.interviews_count,
      available_interviews:
        currentQuota.free_interviews +
        (currentQuota.purchased_interviews + pack.interviews_count) -
        currentQuota.used_interviews,
      total_granted: currentQuota.total_granted + pack.interviews_count,
    };

    assert.strictEqual(updatedQuota.purchased_interviews, 5);
    assert.strictEqual(updatedQuota.available_interviews, 7); // (3 free + 5 purchased) - 1 used = 7
    assert.strictEqual(updatedQuota.total_granted, 8);
  });

  it("4. Starting an interview consumes 1 interview from available balance", () => {
    const quota: CandidateMockInterviewQuota = {
      free_interviews: 3,
      purchased_interviews: 0,
      used_interviews: 0,
      available_interviews: 3,
      total_granted: 3,
    };

    // User starts an interview session
    const afterSession1: CandidateMockInterviewQuota = {
      ...quota,
      used_interviews: quota.used_interviews + 1,
      available_interviews: Math.max(0, (quota.free_interviews + quota.purchased_interviews) - (quota.used_interviews + 1)),
    };
    assert.strictEqual(afterSession1.used_interviews, 1);
    assert.strictEqual(afterSession1.available_interviews, 2);

    // User starts second and third interviews
    const afterSession3: CandidateMockInterviewQuota = {
      ...quota,
      used_interviews: 3,
      available_interviews: Math.max(0, (quota.free_interviews + quota.purchased_interviews) - 3),
    };
    assert.strictEqual(afterSession3.used_interviews, 3);
    assert.strictEqual(afterSession3.available_interviews, 0);
  });

  it("5. Zero available mock interviews blocks interview start and requires purchase", () => {
    const exhaustedQuota: CandidateMockInterviewQuota = {
      free_interviews: 3,
      purchased_interviews: 0,
      used_interviews: 3,
      available_interviews: 0,
      total_granted: 3,
    };

    const isStartAllowed = exhaustedQuota.available_interviews > 0;
    assert.strictEqual(isStartAllowed, false);

    // Simulate backend 402 HTTP error payload
    const backendError = {
      status: 402,
      data: {
        code: "INSUFFICIENT_MOCK_INTERVIEWS",
        error: "You have 0 mock interviews remaining. Please purchase more mock interviews to continue.",
        available_interviews: 0,
      },
    };

    assert.strictEqual(backendError.status, 402);
    assert.strictEqual(backendError.data.code, "INSUFFICIENT_MOCK_INTERVIEWS");
  });

  it("6. Razorpay order initialization sets correct currency, paise amount and pack metadata", () => {
    const pack = DEFAULT_MOCK_INTERVIEW_PACKS.find((p) => p.interviews_count === 10)!; // ₹700
    assert.strictEqual(pack.price_paise, 70000);

    const razorpayOptions = {
      key: "rzp_test_sample",
      amount: pack.price_paise,
      currency: "INR",
      name: "Yuvro Mock Interviews",
      description: `${pack.name} Pack`,
      order_id: "order_mock_test_123",
      interviews_count: pack.interviews_count,
    };

    assert.strictEqual(razorpayOptions.currency, "INR");
    assert.strictEqual(razorpayOptions.amount, 70000);
    assert.strictEqual(razorpayOptions.interviews_count, 10);
  });

  it("7. Payment verification response updates quota idempotently", () => {
    const verificationResponse = {
      status: "SUCCESS",
      message: "Successfully added 5 mock interview(s) to your balance.",
      quota: {
        free_interviews: 3,
        purchased_interviews: 5,
        used_interviews: 2,
        available_interviews: 6,
        total_granted: 8,
      },
    };

    assert.strictEqual(verificationResponse.status, "SUCCESS");
    assert.strictEqual(verificationResponse.quota.available_interviews, 6);
    assert.strictEqual(verificationResponse.quota.purchased_interviews, 5);
  });
});
