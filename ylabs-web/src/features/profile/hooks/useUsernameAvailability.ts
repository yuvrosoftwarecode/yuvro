import { useState, useEffect, useRef } from "react";
import { yhubApiAuthUtil } from "../../../utils/RestApiAuthUtil.ts";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export interface UsernameAvailabilityState {
  status: UsernameStatus;
  message: string;
  canSave: boolean;
  isChecking: boolean;
}

interface CheckResult {
  available: boolean;
  reason?: "taken" | "invalid" | "reserved";
}

// Session cache to prevent re-fetching on backspaces
export const usernameSessionCache = new Map<string, CheckResult>();

export function validateUsernameLocally(username: string): { isValid: boolean; message?: string } {
  if (!username) {
    return { isValid: false, message: "Username cannot be empty." };
  }
  if (username.length < 3) {
    return { isValid: false, message: "Username must be at least 3 characters." };
  }
  if (username.length > 30) {
    return { isValid: false, message: "Username must be 30 characters or fewer." };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    return {
      isValid: false,
      message: "Letters, numbers, periods, underscores, and hyphens only.",
    };
  }
  return { isValid: true };
}

export function useUsernameAvailability(
  username: string,
  currentUsername: string
): UsernameAvailabilityState {
  const clean = (username || "").trim();
  const cleanCurrent = (currentUsername || "").trim();
  const isUnchanged = clean.toLowerCase() === cleanCurrent.toLowerCase();

  const [state, setState] = useState<UsernameAvailabilityState>(() => {
    if (!clean || isUnchanged) {
      return { status: "idle", message: "", canSave: true, isChecking: false };
    }
    const local = validateUsernameLocally(clean);
    if (!local.isValid) {
      return {
        status: "invalid",
        message: local.message || "Invalid username format.",
        canSave: false,
        isChecking: false,
      };
    }
    return { status: "checking", message: "Checking availability...", canSave: false, isChecking: true };
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 1. Unchanged from user's current username: no network request, idle
    if (isUnchanged) {
      abortControllerRef.current?.abort();
      setState({ status: "idle", message: "", canSave: true, isChecking: false });
      return;
    }

    // 2. Empty string
    if (!clean) {
      abortControllerRef.current?.abort();
      setState({ status: "invalid", message: "Username cannot be empty.", canSave: false, isChecking: false });
      return;
    }

    // 3. Local format check (do not hit API if invalid)
    const local = validateUsernameLocally(clean);
    if (!local.isValid) {
      abortControllerRef.current?.abort();
      setState({
        status: "invalid",
        message: local.message || "Invalid username format.",
        canSave: false,
        isChecking: false,
      });
      return;
    }

    const lowerName = clean.toLowerCase();

    // 4. Check session cache
    if (usernameSessionCache.has(lowerName)) {
      abortControllerRef.current?.abort();
      const cached = usernameSessionCache.get(lowerName)!;
      if (cached.available) {
        setState({
          status: "available",
          message: `${clean} is available`,
          canSave: true,
          isChecking: false,
        });
      } else {
        const msg =
          cached.reason === "reserved"
            ? "This username is reserved."
            : `${clean} is already taken`;
        setState({
          status: "taken",
          message: msg,
          canSave: false,
          isChecking: false,
        });
      }
      return;
    }

    // 5. Debounce 400ms before calling API
    setState({
      status: "checking",
      message: "Checking availability...",
      canSave: false,
      isChecking: true,
    });

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await yhubApiAuthUtil.get<CheckResult>(
          `/me/username-available?username=${encodeURIComponent(clean)}`,
          { signal: controller.signal }
        );

        if (controller.signal.aborted) return;

        usernameSessionCache.set(lowerName, res);

        if (res.available) {
          setState({
            status: "available",
            message: `${clean} is available`,
            canSave: true,
            isChecking: false,
          });
        } else {
          const msg =
            res.reason === "reserved"
              ? "This username is reserved."
              : `${clean} is already taken`;
          setState({
            status: "taken",
            message: msg,
            canSave: false,
            isChecking: false,
          });
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;

        // Fail open on network/server error: allow save, final submit will verify
        setState({
          status: "error",
          message: "Could not check right now. We will verify when you save.",
          canSave: true,
          isChecking: false,
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clean, isUnchanged]);

  return state;
}
