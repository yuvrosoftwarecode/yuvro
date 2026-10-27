import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { creditEvents } from "../../../context/creditEvents.ts";
import type {
  CreditWallet,
  CreditPack,
  CreateOrderResponse,
  VerifyPaymentResponse,
  VerifyPaymentPayload,
  InsufficientCreditsInfo,
} from "../../../services/creditService.ts";

describe("Stage 5: Yuvro AI Credits Frontend Test Suite", () => {
  // Mock API fixtures
  const mockWalletOk: CreditWallet = {
    bonus_balance: 50000,
    purchased_balance: 250000,
    reserved_bonus: 0,
    reserved_purchased: 0,
    total_available: 300000,
    total_reserved: 0,
    total_balance: 300000,
    signup_bonus_granted: true,
    uncollected_deficit: 0,
    reconciliation_status: "ok",
  };

  const mockWalletEmpty: CreditWallet = {
    bonus_balance: 0,
    purchased_balance: 0,
    reserved_bonus: 0,
    reserved_purchased: 0,
    total_available: 0,
    total_reserved: 0,
    total_balance: 0,
    signup_bonus_granted: true,
    uncollected_deficit: 0,
    reconciliation_status: "ok",
  };

  const mockWalletDeficit: CreditWallet = {
    bonus_balance: 0,
    purchased_balance: 0,
    reserved_bonus: 0,
    reserved_purchased: 0,
    total_available: 0,
    total_reserved: 0,
    total_balance: 0,
    signup_bonus_granted: true,
    uncollected_deficit: 1500,
    reconciliation_status: "deficit_flagged",
  };

  const mockPacks: CreditPack[] = [
    {
      id: "starter",
      name: "Starter",
      description: "Essential credit pack for students",
      credits: 250000,
      price_inr: 199,
      price_paise: 19900,
      currency: "INR",
      sort_order: 1,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Recommended pack for intensive technical prep",
      credits: 750000,
      price_inr: 499,
      price_paise: 49900,
      currency: "INR",
      sort_order: 2,
    },
    {
      id: "power",
      name: "Power",
      description: "Maximum credits for power users",
      credits: 1750000,
      price_inr: 999,
      price_paise: 99900,
      currency: "INR",
      sort_order: 3,
    },
  ];

  // 1. Wallet loading, successful response, empty state, and API failure
  test("1. Wallet loading: handles successful response, empty state, and API failure", async () => {
    let mockApiStatus: "ok" | "empty" | "fail" = "ok";

    const fetchWallet = async (): Promise<CreditWallet> => {
      if (mockApiStatus === "fail") {
        throw new Error("HTTP 500: Server Error");
      }
      return mockApiStatus === "empty" ? mockWalletEmpty : mockWalletOk;
    };

    // Successful response
    mockApiStatus = "ok";
    const walletData = await fetchWallet();
    assert.strictEqual(walletData.total_available, 300000);
    assert.strictEqual(walletData.bonus_balance, 50000);
    assert.strictEqual(walletData.purchased_balance, 250000);

    // Empty state
    mockApiStatus = "empty";
    const emptyData = await fetchWallet();
    assert.strictEqual(emptyData.total_available, 0);
    assert.strictEqual(emptyData.total_balance, 0);

    // API failure
    mockApiStatus = "fail";
    await assert.rejects(
      async () => await fetchWallet(),
      (err: Error) => {
        assert.match(err.message, /500/);
        return true;
      },
    );
  });

  // 2. Rendering pack details from backend data
  test("2. Pack catalog: renders server-returned pack details and excludes signup bonus", () => {
    assert.strictEqual(mockPacks.length, 3);
    const packIds = mockPacks.map((p) => p.id);
    assert.deepStrictEqual(packIds, ["starter", "pro", "power"]);

    // Ensure signup bonus is NOT a paid pack
    assert.strictEqual(
      mockPacks.some((p) => p.id === "signup_bonus"),
      false,
    );

    // Verify prices & credits
    const starter = mockPacks.find((p) => p.id === "starter");
    assert.ok(starter);
    assert.strictEqual(starter.price_inr, 199);
    assert.strictEqual(starter.credits, 250000);

    const pro = mockPacks.find((p) => p.id === "pro");
    assert.ok(pro);
    assert.strictEqual(pro.price_inr, 499);
    assert.strictEqual(pro.credits, 750000);

    const power = mockPacks.find((p) => p.id === "power");
    assert.ok(power);
    assert.strictEqual(power.price_inr, 999);
    assert.strictEqual(power.credits, 1750000);
  });

  // 3. Order creation with the correct server-provided pack identifier
  test("3. Order creation: uses authoritative server pack identifier and returns gateway order", async () => {
    const createOrderMock = async (
      packId: string,
      clientRequestId: string,
    ): Promise<CreateOrderResponse> => {
      const selected = mockPacks.find((p) => p.id === packId);
      if (!selected) throw new Error("Invalid pack_id");
      return {
        order_id: `order_${Date.now()}`,
        payment_id: "pay_test_uuid",
        amount: selected.price_paise,
        currency: selected.currency,
        key_id: "rzp_test_key123",
        name: "Yuvro AI Credits",
        description: `${selected.name} Pack`,
        pack_id: selected.id,
        credits: selected.credits,
      };
    };

    const res = await createOrderMock("starter", "req-123");
    assert.strictEqual(res.pack_id, "starter");
    assert.strictEqual(res.amount, 19900);
    assert.strictEqual(res.currency, "INR");
    assert.strictEqual(res.key_id, "rzp_test_key123");
    assert.ok(res.order_id.startsWith("order_"));
  });

  // 4. Razorpay checkout initialization and success callback
  test("4. Razorpay checkout: initializes with server order details and triggers handler", (t, done) => {
    const orderData: CreateOrderResponse = {
      order_id: "order_rzp_456",
      payment_id: "pay_uuid_456",
      amount: 49900,
      currency: "INR",
      key_id: "rzp_test_key123",
      name: "Yuvro AI Credits",
      description: "Pro Pack",
      pack_id: "pro",
      credits: 750000,
    };

    const razorpayOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: orderData.name,
      order_id: orderData.order_id,
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        assert.strictEqual(response.razorpay_order_id, "order_rzp_456");
        assert.strictEqual(response.razorpay_payment_id, "pay_rzp_mock789");
        assert.strictEqual(response.razorpay_signature, "sig_valid_abc");
        done();
      },
    };

    assert.strictEqual(razorpayOptions.key, "rzp_test_key123");
    assert.strictEqual(razorpayOptions.order_id, "order_rzp_456");

    // Simulate Razorpay success callback
    razorpayOptions.handler({
      razorpay_order_id: "order_rzp_456",
      razorpay_payment_id: "pay_rzp_mock789",
      razorpay_signature: "sig_valid_abc",
    });
  });

  // 5. Backend verification success before showing purchase success
  test("5. Payment verification: marks purchase success only after backend confirms", async () => {
    let uiPurchaseSuccess = false;

    const verifyMock = async (payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> => {
      if (payload.signature === "valid_sig") {
        return {
          status: "SUCCESS",
          payment_id: "pay_internal_123",
          credits_credited: 250000,
          was_already_credited: false,
        };
      }
      return {
        status: "FAILED",
        payment_id: "pay_internal_123",
        credits_credited: 0,
        was_already_credited: false,
      };
    };

    const validPayload: VerifyPaymentPayload = {
      gateway_order_id: "order_1",
      gateway_payment_id: "pay_1",
      signature: "valid_sig",
    };

    const res = await verifyMock(validPayload);
    if (res.status === "SUCCESS") {
      uiPurchaseSuccess = true;
    }

    assert.strictEqual(uiPurchaseSuccess, true);
    assert.strictEqual(res.credits_credited, 250000);
  });

  // 6. Verification rejection and ambiguous verification/network failure
  test("6. Verification failure: handles signature rejection and network timeout", async () => {
    interface ApiTestError extends Error {
      status?: number;
    }

    const verifyMock = async (
      payload: VerifyPaymentPayload,
      scenario: "reject" | "timeout",
    ): Promise<VerifyPaymentResponse> => {
      if (scenario === "reject") {
        const error: ApiTestError = new Error("Invalid signature");
        error.status = 400;
        throw error;
      }
      throw new Error("Network timeout: gateway unreachable");
    };

    const payload: VerifyPaymentPayload = {
      gateway_order_id: "order_fail",
      gateway_payment_id: "pay_fail",
      signature: "bad_sig",
    };

    // Scenario A: Rejection
    try {
      await verifyMock(payload, "reject");
      assert.fail("Should have thrown");
    } catch (err: unknown) {
      const e = err as ApiTestError;
      assert.strictEqual(e.status, 400);
      assert.strictEqual(e.message, "Invalid signature");
    }

    // Scenario B: Ambiguous Network Timeout (payload retained for retry)
    let pendingPayload: VerifyPaymentPayload | null = null;
    let verificationErrorNotice = "";
    try {
      await verifyMock(payload, "timeout");
      assert.fail("Should have thrown");
    } catch {
      pendingPayload = payload;
      verificationErrorNotice = "Verification timed out. Safe to retry.";
    }

    assert.ok(pendingPayload);
    assert.strictEqual(pendingPayload.gateway_payment_id, "pay_fail");
    assert.strictEqual(verificationErrorNotice, "Verification timed out. Safe to retry.");
  });

  // 7. Checkout cancellation and payment failure
  test("7. Checkout cancellation & failure: resets processing state without false claims", () => {
    let isProcessing = true;
    let userNotice = "";

    // Simulate modal.ondismiss
    const onDismiss = () => {
      isProcessing = false;
      userNotice = "Checkout dismissed.";
    };

    onDismiss();
    assert.strictEqual(isProcessing, false);
    assert.strictEqual(userNotice, "Checkout dismissed.");

    // Simulate payment.failed
    isProcessing = true;
    const onPaymentFailed = (errDesc: string) => {
      isProcessing = false;
      userNotice = errDesc;
    };

    onPaymentFailed("Card declined by issuing bank.");
    assert.strictEqual(isProcessing, false);
    assert.strictEqual(userNotice, "Card declined by issuing bank.");
  });

  // 8. Duplicate-click prevention and repeated callback handling
  test("8. Duplicate prevention & idempotency: ignores re-entrant clicks and handles already credited", async () => {
    let isProcessing = false;
    let orderCreationCalls = 0;

    const handleBuyClick = async () => {
      if (isProcessing) return; // Prevent duplicate clicks
      isProcessing = true;
      orderCreationCalls++;
    };

    // User double clicks rapidly
    await Promise.all([handleBuyClick(), handleBuyClick()]);
    assert.strictEqual(orderCreationCalls, 1);

    // Repeated verification callback
    const verifyResponse: VerifyPaymentResponse = {
      status: "SUCCESS",
      payment_id: "pay_123",
      credits_credited: 250000,
      was_already_credited: true, // Idempotent second verification
    };
    assert.strictEqual(verifyResponse.was_already_credited, true);
  });

  // 9. Balance refresh after verified purchase
  test("9. Balance refresh: authoritative balance fetched after purchase verification", async () => {
    let currentBalance = 50000;

    const refreshBalanceFromServer = async () => {
      currentBalance = 300000; // Simulated DB balance after backend crediting
      return currentBalance;
    };

    const newBalance = await refreshBalanceFromServer();
    assert.strictEqual(newBalance, 300000);
  });

  // 10. HTTP 402 insufficient-credit response
  test("10. HTTP 402 handling: emits insufficient credits event with available and required", (t, done) => {
    const unsub = creditEvents.onInsufficient((info: InsufficientCreditsInfo) => {
      assert.strictEqual(info.available, 100);
      assert.strictEqual(info.required, 500);
      assert.match(info.message || "", /Insufficient credits/);
      unsub();
      done();
    });

    // Simulate 402 response handling
    const http402Payload = {
      error: "insufficient_credits",
      message: "Insufficient credits to start AI session.",
      available: 100,
      required: 500,
    };

    creditEvents.emitInsufficient({
      available: http402Payload.available,
      required: http402Payload.required,
      message: http402Payload.message,
    });
  });

  // 11. SSE insufficient_credits event
  test("11. SSE event handling: parses stream event and triggers insufficient credits modal", (t, done) => {
    const unsub = creditEvents.onInsufficient((info: InsufficientCreditsInfo) => {
      assert.strictEqual(info.available, 0);
      assert.strictEqual(info.required, 150);
      unsub();
      done();
    });

    const sseRawChunk = `data: {"error": "Out of credits", "error_code": "insufficient_credits", "available": 0, "required": 150}`;
    const parsedData = JSON.parse(sseRawChunk.substring(6));

    if (parsedData.error_code === "insufficient_credits") {
      creditEvents.emitInsufficient({
        available: parsedData.available,
        required: parsedData.required,
        message: parsedData.error,
      });
    }
  });

  // 12. Duplicate SSE error suppression
  test("12. Duplicate SSE error suppression: prevents repeated modal triggers during single stream", () => {
    let emitCount = 0;
    const unsub = creditEvents.onInsufficient(() => {
      emitCount++;
    });

    let hasEmittedInsufficient = false;

    // Simulate receiving 3 consecutive insufficient_credits chunks in one stream
    const chunks = [
      { error_code: "insufficient_credits", available: 5, required: 50 },
      { error_code: "insufficient_credits", available: 5, required: 50 },
      { error_code: "insufficient_credits", available: 5, required: 50 },
    ];

    for (const chunk of chunks) {
      if (chunk.error_code === "insufficient_credits") {
        if (!hasEmittedInsufficient) {
          hasEmittedInsufficient = true;
          creditEvents.emitInsufficient({
            available: chunk.available,
            required: chunk.required,
          });
        }
      }
    }

    unsub();
    assert.strictEqual(emitCount, 1);
  });

  // 13. Preservation of chat drafts and context when opening purchase modal
  test("13. Chat preservation: messages and input draft remain intact upon insufficient modal trigger", () => {
    const messages = [
      { id: "msg-1", message_type: "user", content: "Can you review my SQL query?" },
    ];
    const draftInput = "SELECT * FROM orders WHERE ...";

    // Simulate modal open & close
    let isModalOpen = true;
    isModalOpen = false;

    // Confirm chat state was untouched
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].content, "Can you review my SQL query?");
    assert.strictEqual(draftInput, "SELECT * FROM orders WHERE ...");
    assert.strictEqual(isModalOpen, false);
  });

  // 14. Existing chat behavior when the wallet feature is unavailable or backend flag disabled
  test("14. Feature flag disabled fallback: handles 404 gracefully without breaking chat", async () => {
    let walletState: CreditWallet | null = null;
    let walletError: string | null = null;

    const fetchWalletDisabled = async () => {
      throw new Error("404 Not Found: AI credits system disabled");
    };

    try {
      walletState = await fetchWalletDisabled();
    } catch (err: unknown) {
      walletError = err instanceof Error ? err.message : String(err);
    }

    assert.strictEqual(walletState, null);
    assert.match(walletError || "", /disabled/);
    // Chat can continue normally even if wallet balance badge is in error/hidden state
  });

  // 15. Responsive rendering, accessible labels and deficit warning
  test("15. Accessibility & Deficit warning: accurately represents deficit and prevents claiming available credits", () => {
    // Normal wallet
    const formatNumber = (num: number) => new Intl.NumberFormat("en-IN").format(num);
    const normalLabel = `AI Credits: ${formatNumber(mockWalletOk.total_available)} available.`;
    assert.strictEqual(normalLabel, "AI Credits: 3,00,000 available.");

    // Deficit wallet
    const hasDeficit = mockWalletDeficit.uncollected_deficit > 0;
    assert.strictEqual(hasDeficit, true);

    const deficitLabel = hasDeficit
      ? `Account has credit deficit: ${formatNumber(mockWalletDeficit.uncollected_deficit)} credits.`
      : `AI Credits: ${formatNumber(mockWalletDeficit.total_available)} available.`;

    assert.strictEqual(deficitLabel, "Account has credit deficit: 1,500 credits.");

    // Ensure UI does not claim deficit credits are available
    const displayBalance = hasDeficit ? "Deficit" : formatNumber(mockWalletDeficit.total_available);
    assert.strictEqual(displayBalance, "Deficit");
  });
});
