import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: ({ search }) => {
    if (typeof window !== "undefined" && search.ref) {
      try {
        localStorage.setItem("ylabs_referral_code", search.ref);
        sessionStorage.setItem("ylabs_referral_code", search.ref);
      } catch {
        // ignore storage errors
      }
    }
    throw redirect({
      to: "/auth",
      search: {
        tab: "signup",
        ref: search.ref || undefined,
      },
    });
  },
  component: RegisterRedirect,
});

function RegisterRedirect() {
  return null;
}
