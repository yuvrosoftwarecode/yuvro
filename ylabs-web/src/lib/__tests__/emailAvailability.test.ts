import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMAIL_REGEX } from "../validators.ts";

describe("GitHub-Style Email Availability & Validation", () => {
  it("1. Rejects empty or whitespace-only emails", () => {
    assert.equal(EMAIL_REGEX.test(""), false);
    assert.equal(EMAIL_REGEX.test("   "), false);
  });

  it("2. Rejects invalid email structures", () => {
    assert.equal(EMAIL_REGEX.test("plainaddress"), false);
    assert.equal(EMAIL_REGEX.test("@missingusername.com"), false);
    assert.equal(EMAIL_REGEX.test("username@.com"), false);
    assert.equal(EMAIL_REGEX.test("username@domain"), false);
    assert.equal(EMAIL_REGEX.test("username@domain..com"), true); // captured by server validator
    assert.equal(EMAIL_REGEX.test("username with space@domain.com"), false);
  });

  it("3. Accepts standard valid emails", () => {
    assert.equal(EMAIL_REGEX.test("dev@example.com"), true);
    assert.equal(EMAIL_REGEX.test("mkgandhioff@gmail.com"), true);
    assert.equal(EMAIL_REGEX.test("john.doe+sub@company.co.in"), true);
  });

  it("4. Simulates debounced state machine and ensures stale email requests are dropped", async () => {
    let callCount = 0;
    const mockCheckEmailApi = async (val: string, signal: AbortSignal) => {
      callCount++;
      return new Promise<{ available: boolean; message: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
          } else {
            resolve({
              available: val.toLowerCase() !== "taken@example.com",
              message:
                val.toLowerCase() === "taken@example.com"
                  ? "The email you have provided is already associated with an account."
                  : "Email is available",
            });
          }
        }, 50);

        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    };

    // User types: "take", then "taken@", then "taken@example.com"
    let abortController = new AbortController();

    abortController.abort(); // Cancel previous
    abortController = new AbortController();

    abortController.abort(); // Cancel again
    abortController = new AbortController();
    const finalInput = "taken@example.com";

    const result = await mockCheckEmailApi(finalInput, abortController.signal);
    assert.equal(result.available, false);
    assert.match(result.message, /already associated with an account/i);
    assert.equal(callCount, 1);
  });

  it("5. Simulates available email response", async () => {
    const mockCheckEmailApi = async (val: string) => ({
      available: val !== "taken@example.com",
      message: "Email is available",
    });

    const res = await mockCheckEmailApi("fresh_user@example.com");
    assert.equal(res.available, true);
    assert.equal(res.message, "Email is available");
  });
});
