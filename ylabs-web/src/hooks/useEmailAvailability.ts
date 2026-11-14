import { useState, useEffect, useRef } from "react";
import { authService } from "../services/authService";
import { EMAIL_REGEX } from "../lib/validators";

export type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export interface EmailAvailabilityState {
  status: EmailStatus;
  message: string;
  isAvailable: boolean;
  isChecking: boolean;
}

/**
 * Custom hook for GitHub-style debounced email availability checking.
 * - Debounces input for 300ms (configurable).
 * - Pre-validates standard email format client-side before sending network requests.
 * - Aborts outdated in-flight requests using AbortController.
 * - Guarantees older responses never overwrite newer input state.
 */
export function useEmailAvailability(
  email: string,
  debounceMs: number = 300
): EmailAvailabilityState {
  const [status, setStatus] = useState<EmailStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const latestEmailRef = useRef(email);
  latestEmailRef.current = email;

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending debounce timer and abort in-flight requests
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const trimmed = email.trim();

    // 1. Idle state when empty
    if (!trimmed) {
      setStatus("idle");
      setMessage("");
      return;
    }

    // 2. Client-side email format pre-validation
    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("invalid");
      setMessage("Please enter a valid email address.");
      return;
    }

    // 3. Format is valid -> show checking status and schedule debounced check
    setStatus("checking");
    setMessage("Checking email availability...");

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await authService.checkEmail(trimmed, controller.signal);

        // Ensure we only update state if the input hasn't changed in the meantime
        if (latestEmailRef.current.trim().toLowerCase() === trimmed.toLowerCase()) {
          if (response.available) {
            setStatus("available");
            setMessage(response.message || "Email is available");
          } else {
            setStatus("taken");
            setMessage(
              response.message || "The email you have provided is already associated with an account."
            );
          }
        }
      } catch (err: unknown) {
        // Ignore aborted requests
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name: string }).name === "AbortError"
        ) {
          return;
        }

        // Only update if current
        if (latestEmailRef.current.trim().toLowerCase() === trimmed.toLowerCase()) {
          setStatus("error");
          setMessage("Unable to verify email. Check connection.");
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [email, debounceMs]);

  return {
    status,
    message,
    isAvailable: status === "available",
    isChecking: status === "checking",
  };
}
