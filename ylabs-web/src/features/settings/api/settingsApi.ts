import { Device, PasswordChangePayload } from "../types";
import authService, { ActiveSession } from "@/services/authService";

function mapSessionToDevice(s: ActiveSession): Device {
  const isMobile =
    (s.device_type || "").toLowerCase().includes("mobile") ||
    /iphone|android|ipad/i.test(s.os || "");
  const osLabel = s.os || (isMobile ? "Mobile Device" : "Workstation");
  const deviceName = s.device_type
    ? `${s.device_type} (${osLabel})`
    : osLabel;

  return {
    id: s.id,
    name: deviceName,
    browser: s.browser || "Web Browser",
    os: s.os || "Unknown OS",
    ip: s.ip_address || "—",
    location: s.location || "Current Location",
    lastActive: s.last_activity || s.created_at || new Date().toISOString(),
    isCurrent: Boolean(s.is_current),
  };
}

export const settingsApi = {
  async getDevices(): Promise<Device[]> {
    try {
      const sessions = await authService.getActiveSessions();
      if (Array.isArray(sessions) && sessions.length > 0) {
        return sessions.map(mapSessionToDevice);
      }
    } catch (e) {
      console.warn("Could not load backend sessions, using current browser session", e);
    }

    const isMac =
      typeof navigator !== "undefined" &&
      navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const isWindows =
      typeof navigator !== "undefined" &&
      navigator.platform.toUpperCase().indexOf("WIN") >= 0;
    const osName = isMac ? "macOS" : isWindows ? "Windows" : "Desktop OS";

    return [
      {
        id: "current-session",
        name: `Current Browser (${osName})`,
        browser: "Current Browser",
        os: osName,
        ip: "Local Session",
        location: "Current Location",
        lastActive: new Date().toISOString(),
        isCurrent: true,
      },
    ];
  },

  async removeDevice(id: string): Promise<void> {
    if (id === "current-session") {
      throw new Error("Cannot remove your current active device session");
    }
    await authService.revokeSession(id);
  },

  async signOutAllOtherDevices(): Promise<void> {
    await authService.revokeAllOtherSessions();
  },

  async changePassword(payload: PasswordChangePayload): Promise<void> {
    if (!payload.currentPassword) {
      throw new Error("Current password is required");
    }
    if (payload.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(payload.newPassword)) {
      throw new Error("New password must contain at least one uppercase letter");
    }
    if (!/[0-9]/.test(payload.newPassword)) {
      throw new Error("New password must contain at least one number");
    }
    if (payload.newPassword === payload.currentPassword) {
      throw new Error("New password must differ from current password");
    }
    if (payload.newPassword !== payload.confirmPassword) {
      throw new Error("Password confirmation does not match");
    }

    await authService.changePassword({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
  },

  async deleteAccount(): Promise<void> {
    await authService.logoutUser();
  },
};
