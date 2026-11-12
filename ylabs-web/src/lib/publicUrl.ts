import { env } from "./env.ts";

export function getPublicProfileBaseUrl(overrideBase?: string): string {
  const base = overrideBase || env.PUBLIC_PROFILE_BASE_URL || "http://localhost:3002";
  return base.replace(/\/+$/, "");
}

export function buildPublicProfileUrl(username: string, overrideBase?: string): string {
  const base = getPublicProfileBaseUrl(overrideBase);
  const cleanUsername = (username || "").trim();
  return `${base}/u/${encodeURIComponent(cleanUsername)}`;
}

export function formatPublicProfileDisplayUrl(username: string, overrideBase?: string): string {
  const fullUrl = buildPublicProfileUrl(username, overrideBase);
  // Drops the protocol: e.g. "https://yuvro.com/u/user" -> "yuvro.com/u/user"
  return fullUrl.replace(/^https?:\/\//i, "");
}
