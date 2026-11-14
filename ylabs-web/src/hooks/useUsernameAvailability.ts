import { useState, useEffect, useRef } from "react";
import { authService } from "../services/authService";
import { validateUsernameFormat } from "../lib/validators";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export interface UsernameAvailabilityState {
  status: UsernameStatus;
  message: string;
  isAvailable: boolean;
  isChecking: boolean;
}

/**
 * Custom hook for GitHub-style debounced username availability checking.
 * - Debounces input for 300ms (configurable).
 * - Immediately checks format client-side before dispatching network request.
 * - Aborts outdated in-flight requests using AbortController.
 * - Guarantees older responses never overwrite newer input state.
 */
export function useUsernameAvailability(
  username: string,
  debounceMs: number = 300
): UsernameAvailabilityState {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const latestUsernameRef = useRef(username);
  latestUsernameRef.current = username;

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending timer and abort in-flight requests
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const trimmed = username.trim();

    // 1. Idle state when empty
    if (!trimmed) {
      setStatus("idle");
      setMessage("");
      return;
    }

    // 2. Client-side format pre-validation
    const formatCheck = validateUsernameFormat(trimmed);
    if (!formatCheck.isValid) {
      setStatus("invalid");
      setMessage(formatCheck.error || "Please enter a valid username.");
      return;
    }

    // 3. Format is valid -> show checking status and schedule debounced check
    setStatus("checking");
    setMessage("Checking availability...");

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await authService.checkUsername(trimmed, controller.signal);

        // Ensure we only update state if the input hasn't changed in the meantime
        if (latestUsernameRef.current.trim() === trimmed) {
          if (response.available) {
            setStatus("available");
            setMessage(response.message || "Username is available");
          } else {
            setStatus("taken");
            setMessage(response.message || "Username is already taken");
          }
        }
      } catch (err: unknown) {
        // Ignore aborted requests
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "AbortError") {
          return;
        }

        // Only update if current
        if (latestUsernameRef.current.trim() === trimmed) {
          setStatus("error");
          setMessage("Unable to verify username. Check connection.");
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
  }, [username, debounceMs]);

  return {
    status,
    message,
    isAvailable: status === "available",
    isChecking: status === "checking",
  };
}
