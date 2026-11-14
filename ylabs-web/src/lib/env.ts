import { z } from "zod";

const envSchema = z.object({
  VITE_PUBLIC_PROFILE_BASE_URL: z
    .string({
      required_error: "VITE_PUBLIC_PROFILE_BASE_URL is required",
    })
    .trim()
    .url("VITE_PUBLIC_PROFILE_BASE_URL must be a valid URL")
    .refine(
      (val) => /^https?:\/\//i.test(val),
      "VITE_PUBLIC_PROFILE_BASE_URL must be an absolute http(s) URL"
    )
    .transform((val) => val.replace(/\/+$/, "")),
});

export function parseEnv(rawEnv: Record<string, any> = {}) {
  const isProd =
    rawEnv.PROD === true ||
    rawEnv.NODE_ENV === "production" ||
    rawEnv.MODE === "production";

  let rawUrl = rawEnv.VITE_PUBLIC_PROFILE_BASE_URL;

  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim() === "") {
    if (isProd) {
      throw new Error(
        "Missing required environment variable: VITE_PUBLIC_PROFILE_BASE_URL"
      );
    }
    rawUrl = "http://localhost:3002";
  }

  const parsed = envSchema.safeParse({
    VITE_PUBLIC_PROFILE_BASE_URL: rawUrl,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return {
    PUBLIC_PROFILE_BASE_URL: parsed.data.VITE_PUBLIC_PROFILE_BASE_URL,
    ...parsed.data,
  };
}

export const env = parseEnv(
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}
);
