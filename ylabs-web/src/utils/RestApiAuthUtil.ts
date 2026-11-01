import { RestApiUtil, ApiError } from "./RestApiUtil";

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class RestApiAuthUtil extends RestApiUtil {
  private token: string | null = null;
  private static instances: Set<RestApiAuthUtil> = new Set();
  private static refreshPromise: Promise<boolean> | null = null;
  private static refreshSubscribers: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
  }> = [];

  constructor(baseURL: string) {
    super(baseURL);
    RestApiAuthUtil.instances.add(this);
  }

  setAuthToken(token: string, refreshToken?: string) {
    if (token) {
      localStorage.setItem("access", token);
    }
    if (refreshToken) {
      localStorage.setItem("refresh", refreshToken);
    }
    RestApiAuthUtil.updateAllInstanceTokens(token);
  }

  getAuthToken(): string | null {
    const t = this.token || localStorage.getItem("access");
    if (!t || t === "undefined" || t === "null") return null;
    return t;
  }

  clearAuthToken() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    RestApiAuthUtil.instances.forEach((inst) => {
      inst.token = null;
    });
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  async forceRefreshToken(): Promise<boolean> {
    console.log("Force refreshing token...");
    return await this.refreshToken();
  }

  private static updateAllInstanceTokens(token: string) {
    RestApiAuthUtil.instances.forEach((inst) => {
      inst.token = token;
    });
  }

  private static notifySubscribersSuccess(token: string) {
    const subs = [...RestApiAuthUtil.refreshSubscribers];
    RestApiAuthUtil.refreshSubscribers = [];
    subs.forEach((cb) => cb.resolve(token));
  }

  private static notifySubscribersError(error: any) {
    const subs = [...RestApiAuthUtil.refreshSubscribers];
    RestApiAuthUtil.refreshSubscribers = [];
    subs.forEach((cb) => cb.reject(error));
  }

  private static handleGlobalLogout(): void {
    console.log("Logging out user due to authentication failure");
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";

    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    RestApiAuthUtil.instances.forEach((inst) => {
      inst.token = null;
    });

    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/auth") &&
      !window.location.pathname.includes("/evaluation") &&
      !window.location.pathname.includes("/student/dashboard")
    ) {
      window.location.href = `/auth?tab=signin&redirect=${encodeURIComponent(
        currentPath,
      )}`;
    }
  }

  private static async executeRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh");
    const authBaseUrl = (
      import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || "http://localhost:8003/api"
    ).replace(/\/$/, "");

    if (refreshToken) {
      try {
        console.log("Attempting to refresh token...");
        const res = await fetch(`${authBaseUrl}/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (res.ok) {
          const response = await res.json();
          if (response.access) {
            localStorage.setItem("access", response.access);
            if (response.refresh) {
              localStorage.setItem("refresh", response.refresh);
            }
            RestApiAuthUtil.updateAllInstanceTokens(response.access);
            RestApiAuthUtil.notifySubscribersSuccess(response.access);
            console.log("Token refreshed successfully");
            return true;
          }
        }
      } catch (err) {
        console.warn("Standard token refresh failed:", err);
      }
    }

    // Fallback: Check if we can recover an evaluation session
    const currentAccess = localStorage.getItem("access");
    let candidateEmail = "";
    try {
      const cand = JSON.parse(
        localStorage.getItem("yuvro-eval-candidate") || "{}",
      );
      candidateEmail = cand?.email || "";
    } catch {}

    if (currentAccess || candidateEmail) {
      try {
        console.log("Attempting to recover evaluation session token...");
        const res = await fetch(
          `${authBaseUrl}/auth/recover_candidate_session/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: currentAccess,
              email: candidateEmail,
            }),
          },
        );
        if (res.ok) {
          const response = await res.json();
          if (response.access) {
            localStorage.setItem("access", response.access);
            if (response.refresh) {
              localStorage.setItem("refresh", response.refresh);
            }
            RestApiAuthUtil.updateAllInstanceTokens(response.access);
            RestApiAuthUtil.notifySubscribersSuccess(response.access);
            console.log("Evaluation session recovered successfully");
            return true;
          }
        }
      } catch (err) {
        console.warn("Evaluation session recovery failed:", err);
      }
    }

    console.warn("No refresh token or session recovery available");
    RestApiAuthUtil.handleGlobalLogout();
    RestApiAuthUtil.notifySubscribersError(new ApiError("Authentication failed", 401));
    return false;
  }

  private async refreshToken(): Promise<boolean> {
    if (RestApiAuthUtil.refreshPromise) {
      return RestApiAuthUtil.refreshPromise;
    }
    RestApiAuthUtil.refreshPromise = RestApiAuthUtil.executeRefreshToken().finally(
      () => {
        RestApiAuthUtil.refreshPromise = null;
      },
    );
    return RestApiAuthUtil.refreshPromise;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    try {
      let sessId = localStorage.getItem("yuvro_session_id");
      if (!sessId) {
        sessId = "sess_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem("yuvro_session_id", sessId);
      }
      headers["X-Session-Id"] = sessId;
    } catch {
      /* storage unavailable */
    }
    return headers;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    let authHeaders = this.getAuthHeaders() as Record<string, string>;

    if (options.body instanceof FormData) {
      delete authHeaders["Content-Type"];
    }

    let optionsWithAuth = {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    };

    try {
      return await super.request<T>(endpoint, optionsWithAuth);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const isAuthEndpoint =
          endpoint.includes("/auth/login") ||
          endpoint.includes("/auth/register") ||
          endpoint.includes("/auth/token/refresh");

        if (isAuthEndpoint) {
          throw error;
        }

        const refreshPromise = this.refreshToken();

        return new Promise<T>((resolve, reject) => {
          RestApiAuthUtil.refreshSubscribers.push({
            resolve: (newToken: string) => {
              const cleanedHeaders: Record<string, string> = {};
              if (options.headers) {
                Object.entries(
                  options.headers as Record<string, string>,
                ).forEach(([k, v]) => {
                  if (k.toLowerCase() !== "authorization") {
                    cleanedHeaders[k] = v;
                  }
                });
              }
              if (!(options.body instanceof FormData)) {
                cleanedHeaders["Content-Type"] = "application/json";
              }
              cleanedHeaders["Authorization"] = `Bearer ${newToken}`;

              const retryOptionsWithAuth = {
                ...options,
                headers: cleanedHeaders,
              };
              resolve(super.request<T>(endpoint, retryOptionsWithAuth));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }
      throw error;
    }
  }
}

export const restApiAuthUtil = new RestApiAuthUtil(API_BASE_URL);
export const yhubApiAuthUtil = new RestApiAuthUtil(
  import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || API_BASE_URL,
);
export const ycodeApiAuthUtil = new RestApiAuthUtil(
  import.meta.env.VITE_YCODE_BACKEND_API_BASE_URL || "http://localhost:8000/api",
);
export default restApiAuthUtil;
