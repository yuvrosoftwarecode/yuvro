import { redirect } from "@tanstack/react-router";

export function requireStudentAuth(currentUrl?: string) {
  if (typeof window !== "undefined") {
    const searchParams: any = { tab: "signin" };
    if (currentUrl && currentUrl !== "/" && !currentUrl.includes("/auth")) {
      searchParams.redirect = currentUrl;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      throw redirect({ to: "/auth", search: searchParams });
    }
    const userStr = localStorage.getItem("user");
    if (userStr) {
      let user;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        throw redirect({ to: "/auth", search: searchParams });
      }

      if (user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        if (r === "admin") {
          throw redirect({ to: "/admin" });
        } else if (r === "recruiter") {
          throw redirect({ to: "/recruiter/dashboard" });
        }
      }
    } else {
      throw redirect({ to: "/auth", search: searchParams });
    }
  }
}

export function requireAdminAuth(currentUrl?: string) {
  if (typeof window !== "undefined") {
    const searchParams: any = { tab: "signin" };
    if (currentUrl && currentUrl !== "/" && !currentUrl.includes("/auth")) {
      searchParams.redirect = currentUrl;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      throw redirect({ to: "/auth", search: searchParams });
    }
    const userStr = localStorage.getItem("user");
    if (userStr) {
      let user;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        throw redirect({ to: "/auth", search: searchParams });
      }

      if (user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        if (r !== "admin") {
          throw redirect({ to: r === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard" });
        }
      }
    } else {
      throw redirect({ to: "/auth", search: searchParams });
    }
  }
}

export function requireRecruiterAuth(currentUrl?: string) {
  if (typeof window !== "undefined") {
    const searchParams: any = { tab: "signin" };
    if (currentUrl && currentUrl !== "/" && !currentUrl.includes("/auth")) {
      searchParams.redirect = currentUrl;
    }

    const token = localStorage.getItem("access");
    if (!token) {
      throw redirect({ to: "/auth", search: searchParams });
    }
    const userStr = localStorage.getItem("user");
    if (userStr) {
      let user;
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        throw redirect({ to: "/auth", search: searchParams });
      }

      if (user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        if (r !== "recruiter") {
          throw redirect({ to: r === "admin" ? "/admin" : "/student/dashboard" });
        }
      }
    } else {
      throw redirect({ to: "/auth", search: searchParams });
    }
  }
}
