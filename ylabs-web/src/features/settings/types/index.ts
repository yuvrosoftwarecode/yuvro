export interface Device {
  id: string;
  name: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string; // ISO
  isCurrent: boolean;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type SettingsSection = "personal" | "connections" | "security";
