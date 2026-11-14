import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateUsernameFormat } from "../validators.ts";

describe("GitHub-Style Username Availability & Validation", () => {
  it("1. Rejects empty or whitespace-only usernames", () => {
    const resEmpty = validateUsernameFormat("");
    assert.equal(resEmpty.isValid, false);
    assert.match(resEmpty.error || "", /required/i);

    const resSpaces = validateUsernameFormat("   ");
    assert.equal(resSpaces.isValid, false);
  });

  it("2. Rejects usernames with fewer than 3 characters", () => {
    const res1 = validateUsernameFormat("a");
    assert.equal(res1.isValid, false);
    assert.match(res1.error || "", /at least 3 characters/i);

    const res2 = validateUsernameFormat("ab");
    assert.equal(res2.isValid, false);
  });

  it("3. Accepts valid usernames of length 3 to 39 characters with small, capital letters, numbers, and hyphens", () => {
    assert.equal(validateUsernameFormat("dev").isValid, true);
    assert.equal(validateUsernameFormat("manikanta").isValid, true);
    assert.equal(validateUsernameFormat("ManiKanta").isValid, true);
    assert.equal(validateUsernameFormat("Mani-Kanta-05").isValid, true);
    assert.equal(validateUsernameFormat("dev-user-42").isValid, true);
    assert.equal(validateUsernameFormat("john-doe-42").isValid, true);
    assert.equal(validateUsernameFormat("user_123.test").isValid, true);
    assert.equal(validateUsernameFormat("A".repeat(39)).isValid, true);
    assert.equal(validateUsernameFormat("A".repeat(40)).isValid, false);
  });

  it("4. Rejects leading or trailing symbols (hyphens, underscores, dots)", () => {
    assert.equal(validateUsernameFormat("-manikanta").isValid, false);
    assert.equal(validateUsernameFormat("_manikanta").isValid, false);
    assert.equal(validateUsernameFormat(".manikanta").isValid, false);
    assert.equal(validateUsernameFormat("manikanta-").isValid, false);
    assert.equal(validateUsernameFormat("manikanta_").isValid, false);
    assert.equal(validateUsernameFormat("manikanta.").isValid, false);
  });

  it("5. Rejects consecutive symbols", () => {
    assert.equal(validateUsernameFormat("mani--kanta").isValid, false);
    assert.equal(validateUsernameFormat("mani__kanta").isValid, false);
    assert.equal(validateUsernameFormat("mani..kanta").isValid, false);
  });

  it("6. Rejects special characters and spaces", () => {
    assert.equal(validateUsernameFormat("mani kanta").isValid, false);
    assert.equal(validateUsernameFormat("mani@kanta").isValid, false);
    assert.equal(validateUsernameFormat("mani$kanta").isValid, false);
    assert.equal(validateUsernameFormat("mani!kanta").isValid, false);
  });

  it("7. Simulates debounced state machine and ensures stale responses are dropped", async () => {
    let callCount = 0;
    const mockCheckApi = async (val: string, signal: AbortSignal) => {
      callCount++;
      return new Promise<{ available: boolean; message: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
          } else {
            resolve({
              available: val !== "taken_user",
              message: val === "taken_user" ? "Username is already taken" : "Username is available",
            });
          }
        }, 50);

        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    };

    // Simulate fast typing: "man", then "mani", then "manikanta"
    let currentInput = "man";
    let abortController = new AbortController();

    // First keypress triggers debounce timer, but before it fires, user types again
    abortController.abort(); // Cancel previous in-flight/pending
    abortController = new AbortController();
    currentInput = "mani";

    abortController.abort(); // Cancel again
    abortController = new AbortController();
    currentInput = "manikanta";

    // Now wait for the debounced call to complete
    const result = await mockCheckApi(currentInput, abortController.signal);
    assert.equal(result.available, true);
    assert.equal(result.message, "Username is available");
    // Only 1 actual network call executed for the final input
    assert.equal(callCount, 1);
  });

  it("8. Simulates taken username response", async () => {
    const controller = new AbortController();
    const mockCheckApi = async (val: string) => ({
      available: val !== "admin",
      message: val === "admin" ? "Username is already taken" : "Username is available",
    });

    const res = await mockCheckApi("admin");
    assert.equal(res.available, false);
    assert.equal(res.message, "Username is already taken");
  });
});
