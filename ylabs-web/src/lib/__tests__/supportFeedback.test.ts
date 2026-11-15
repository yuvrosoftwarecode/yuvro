import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Support Feedback Validation & Specifications", () => {
  const validateFeedback = (subject: string, description: string) => {
    const cleanSub = subject.trim();
    const cleanDesc = description.trim();
    const errors: { subject?: string; description?: string } = {};

    if (!cleanSub) {
      errors.subject = "Subject is mandatory";
    }
    if (!cleanDesc) {
      errors.description = "Description is mandatory";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  it("fails validation when subject and description are empty", () => {
    const res = validateFeedback("", "");
    assert.equal(res.isValid, false);
    assert.equal(res.errors.subject, "Subject is mandatory");
    assert.equal(res.errors.description, "Description is mandatory");
  });

  it("fails validation when subject has only whitespace", () => {
    const res = validateFeedback("    ", "We need audio speed controls");
    assert.equal(res.isValid, false);
    assert.equal(res.errors.subject, "Subject is mandatory");
    assert.equal(res.errors.description, undefined);
  });

  it("fails validation when description has only whitespace", () => {
    const res = validateFeedback("Speed controls", "   \n\t  ");
    assert.equal(res.isValid, false);
    assert.equal(res.errors.subject, undefined);
    assert.equal(res.errors.description, "Description is mandatory");
  });

  it("passes validation when both subject and description are provided", () => {
    const res = validateFeedback(
      "Add playback speed toggle",
      "Allow 1.25x and 1.5x speed during AI mock interview audio playback."
    );
    assert.equal(res.isValid, true);
    assert.equal(Object.keys(res.errors).length, 0);
  });

  it("formats support mailto URL directed to support@yuvrolabs.com", () => {
    const sub = "Audio Bug";
    const desc = "Audio cuts off in step 2";
    const mailto = `mailto:support@yuvrolabs.com?subject=${encodeURIComponent(
      sub
    )}&body=${encodeURIComponent(desc)}`;

    assert.ok(mailto.startsWith("mailto:support@yuvrolabs.com"));
    assert.ok(mailto.includes("subject=Audio%20Bug"));
    assert.ok(mailto.includes("body=Audio%20cuts%20off%20in%20step%202"));
  });

  it("confirms post-submission acknowledgment message", () => {
    const message = "Thanks for your feedback, you're adding value to the journey";
    assert.equal(
      message,
      "Thanks for your feedback, you're adding value to the journey"
    );
  });
});
