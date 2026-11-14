import React, { useState, useEffect } from "react";
import { Card } from "@/components/profile-ui/Card";
import { Button } from "@/components/profile-ui/Button";
import { Input } from "@/components/profile-ui/Input";
import { ConfirmDialog } from "@/components/profile-ui/ConfirmDialog";
import { useProfileStore } from "@/features/profile/store/profileStore";
import { useAuth } from "@/lib/auth";
import { authService, ActiveSession } from "@/services/authService";
import { toast } from "@/lib/toastStore";
import { validatePassword } from "@/lib/validators";
import { formatRelativeTime } from "@/lib/dateHelpers";

interface DeviceSession {
  id: string;
  name: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

function detectCurrentDevice(): DeviceSession {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      id: "curr-session",
      name: "Current Browser",
      location: "Active session",
      lastActive: "Active now",
      isCurrent: true,
    };
  }
  const ua = navigator.userAgent;
  let browser = "Web Browser";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  let os = "Desktop";
  if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";

  return {
    id: "curr-session",
    name: `${browser} on ${os}`,
    location: "Current device",
    lastActive: "Active now",
    isCurrent: true,
  };
}

export const SecurityTab: React.FC = () => {
  const { profile } = useProfileStore();
  const { user } = useAuth();

  // Password method: old password vs OTP
  const [passwordMethod, setPasswordMethod] = useState<"old_pw" | "otp">("old_pw");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // OTP flow state
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Active Sessions (Where you're logged in)
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [showSignOutOthersConfirm, setShowSignOutOthersConfirm] = useState(false);

  // Delete account state
  const [deleteInput, setDeleteInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  // Load real active sessions on mount
  useEffect(() => {
    let mounted = true;

    async function loadSessions() {
      setLoadingDevices(true);
      try {
        const data = await authService.getActiveSessions();
        if (mounted) {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: DeviceSession[] = data.map((s: ActiveSession) => ({
              id: s.id,
              name: `${s.browser || "Browser"} on ${s.os || "Device"}`,
              location: s.location || "Active location",
              lastActive: s.is_current
                ? "Active now"
                : s.last_activity
                ? formatRelativeTime(s.last_activity)
                : "Recently active",
              isCurrent: Boolean(s.is_current),
            }));
            setDevices(mapped);
          } else {
            setDevices([detectCurrentDevice()]);
          }
        }
      } catch {
        if (mounted) {
          setDevices([detectCurrentDevice()]);
        }
      } finally {
        if (mounted) {
          setLoadingDevices(false);
        }
      }
    }

    loadSessions();

    return () => {
      mounted = false;
    };
  }, []);

  // Password checklist conditions
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const differsFromCurrent =
    passwordMethod === "otp"
      ? true
      : newPassword.length > 0 &&
        (currentPassword.length === 0 || newPassword !== currentPassword);

  const checklistItems = [
    { label: "8+ characters", passed: hasMinLength },
    { label: "At least one uppercase letter", passed: hasUppercase },
    { label: "At least one number", passed: hasNumber },
    ...(passwordMethod === "old_pw"
      ? [{ label: "Differs from current password", passed: differsFromCurrent }]
      : []),
  ];

  const strengthScore = checklistItems.filter((item) => item.passed).length;
  const canSubmitPassword =
    passwordMethod === "old_pw"
      ? Boolean(currentPassword && newPassword && confirmPassword && strengthScore >= 3 && !passwordUpdating)
      : Boolean(otp && otp.length === 6 && newPassword && confirmPassword && strengthScore >= 3 && !passwordUpdating);

  const handleSendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await authService.sendChangePasswordOtp();
      setOtpSent(true);
      setOtpCountdown(60);
      toast.success(res?.message || "Verification code sent to your registered email");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || err?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setOtpSending(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordMethod === "old_pw") {
      if (!currentPassword) {
        toast.error("Please enter your current password");
        return;
      }
      const validation = validatePassword(newPassword, currentPassword);
      if (!validation.valid) {
        toast.error(validation.errors[0] || "Invalid new password");
        return;
      }
    } else {
      if (!otp || otp.trim().length !== 6) {
        toast.error("Please enter the 6-digit verification code sent to your email");
        return;
      }
      const validation = validatePassword(newPassword, "");
      if (!validation.valid) {
        toast.error(validation.errors[0] || "Invalid new password");
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordUpdating(true);
    try {
      await authService.changePassword({
        currentPassword: passwordMethod === "old_pw" ? currentPassword : undefined,
        otp: passwordMethod === "otp" ? otp.trim() : undefined,
        newPassword,
      });
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (Array.isArray(err?.response?.data?.error)
          ? err.response.data.error.join(" ")
          : err?.message || "Failed to update password");
      toast.error(typeof msg === "string" ? msg : "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleRemoveDevice = async (id: string) => {
    try {
      if (id !== "curr-session") {
        await authService.revokeSession(id);
      }
      setDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success("Device signed out");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to sign out device");
    } finally {
      setDeviceToRemove(null);
    }
  };

  const handleSignOutAllOther = async () => {
    try {
      await authService.revokeAllOtherSessions();
      setDevices((prev) => prev.filter((d) => d.isCurrent));
      toast.success("Signed out of all other devices");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Failed to sign out other devices");
    } finally {
      setShowSignOutOthersConfirm(false);
    }
  };

  const targetEmail = profile?.email || user?.email || "your registered email";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-line pb-3">
        <h2 className="text-base font-semibold text-ink">Security & authentication</h2>
        <p className="text-xs text-muted mt-0.5">
          Manage your password, active sessions, and account credentials
        </p>
      </div>

      {/* 2-Column layout: Change password left, Active sessions right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Change Password */}
        <Card className="p-5 space-y-4">
          <div className="border-b border-line pb-2.5">
            <h3 className="font-semibold text-sm text-ink">Change password</h3>
            <p className="text-xs text-muted mt-0.5">
              Update your account password using your current password or email verification.
            </p>
          </div>

          {/* Toggle between Old Password & OTP */}
          <div className="flex rounded-lg border border-line p-1 bg-bg text-xs font-medium w-full">
            <button
              type="button"
              onClick={() => {
                setPasswordMethod("old_pw");
                setOtp("");
              }}
              className={`flex-1 py-1.5 px-3 rounded text-center transition-colors cursor-pointer ${
                passwordMethod === "old_pw"
                  ? "bg-card text-ink font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Using current password
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordMethod("otp");
                setCurrentPassword("");
              }}
              className={`flex-1 py-1.5 px-3 rounded text-center transition-colors cursor-pointer ${
                passwordMethod === "otp"
                  ? "bg-card text-ink font-semibold shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              Using email OTP
            </button>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5 text-left">
            {passwordMethod === "old_pw" ? (
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Current password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pr-16 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-muted hover:text-ink font-medium select-none"
                  >
                    {showCurrent ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border border-line bg-card p-3 text-xs text-sub space-y-1">
                  <p className="font-medium text-ink">Email verification</p>
                  <p className="text-muted text-[11px]">
                    We will send a 6-digit verification code to <span className="font-mono text-ink">{targetEmail}</span>.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-ink">
                      Verification code (OTP) <span className="text-danger">*</span>
                    </label>
                    {otpSent && (
                      <button
                        type="button"
                        disabled={otpCountdown > 0 || otpSending}
                        onClick={handleSendOtp}
                        className="text-xs hover:text-primary disabled:text-muted cursor-pointer font-medium transition-colors"
                      >
                        {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className="text-xs font-mono tracking-widest text-center flex-1"
                    />
                    {!otpSent && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={otpSending}
                        onClick={handleSendOtp}
                        className="shrink-0 text-xs"
                      >
                        Send OTP
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                New password <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-16 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-muted hover:text-ink font-medium select-none"
                >
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>

              {/* 4-step strength meter */}
              {newPassword.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-colors ${
                          step <= strengthScore ? "bg-primary" : "bg-line"
                        }`}
                      />
                    ))}
                  </div>

                  <ul className="space-y-1 pt-1 text-xs">
                    {checklistItems.map((item) => (
                      <li
                        key={item.label}
                        className={`flex items-center justify-between text-[11px] ${
                          item.passed ? "text-success font-medium" : "text-muted"
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="font-semibold uppercase text-[10px]">
                          {item.passed ? "Done" : "Needed"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Confirm new password <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-16 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-muted hover:text-ink font-medium select-none"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                loading={passwordUpdating}
                disabled={!canSubmitPassword}
              >
                Update password
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Where you're logged in */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <h3 className="font-semibold text-sm text-ink">Where you're logged in</h3>
              <p className="text-xs text-muted mt-0.5">
                Active devices with access to your Yuvro account
              </p>
            </div>

            {devices.filter((d) => !d.isCurrent).length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSignOutOthersConfirm(true)}
                className="text-xs"
              >
                Sign out others
              </Button>
            )}
          </div>

          {loadingDevices ? (
            <div className="py-6 text-center text-xs text-muted">
              Loading active sessions...
            </div>
          ) : (
            <div className="divide-y divide-line">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{device.name}</span>
                      {device.isCurrent && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-success-subtle text-success uppercase">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-[11px]">
                      {device.location} &bull; {device.lastActive}
                    </p>
                  </div>

                  {!device.isCurrent && (
                    <button
                      type="button"
                      onClick={() => setDeviceToRemove(device.id)}
                      className="text-muted hover:text-danger font-medium text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Delete Account Card */}
      <Card className="p-5 border-danger/30 space-y-3 text-left w-full">
        <h3
          className="font-semibold text-sm text-danger"
          style={{ color: "var(--color-danger, var(--danger, #dc2626))" }}
        >
          Delete account
        </h3>
        <p
          className="text-xs text-sub leading-relaxed w-full"
          style={{ color: "var(--color-sub, var(--sub, #344054))" }}
        >
          Permanently delete your profile, verified lab certifications, and interview history.
          This action cannot be undone. To proceed, please confirm by typing your username{" "}
          <strong
            className="text-ink font-mono font-semibold"
            style={{ color: "var(--color-ink, var(--ink, #101828))" }}
          >
            @{profile?.username}
          </strong>{" "}
          below.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full max-w-xl">
          <Input
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder={`Type ${profile?.username || "username"} to confirm`}
            className="text-xs flex-1 min-w-0 h-10"
            style={{ height: "40px" }}
          />
          <Button
            type="button"
            variant="danger"
            disabled={deleteInput.trim() !== (profile?.username || "")}
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 h-10 px-5 text-sm font-medium"
            style={{ height: "40px" }}
          >
            Delete account
          </Button>
        </div>
      </Card>

      {/* Sign out single device dialog */}
      <ConfirmDialog
        open={Boolean(deviceToRemove)}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
        title="Sign out device?"
        description="This device will be logged out of your account immediately."
        confirmLabel="Sign out"
        variant="danger"
        onConfirm={() => deviceToRemove && handleRemoveDevice(deviceToRemove)}
      />

      {/* Sign out all other devices dialog */}
      <ConfirmDialog
        open={showSignOutOthersConfirm}
        onOpenChange={setShowSignOutOthersConfirm}
        title="Sign out all other devices?"
        description="All other active sessions on other devices and browsers will be terminated immediately."
        confirmLabel="Sign out others"
        variant="danger"
        onConfirm={handleSignOutAllOther}
      />

      {/* Delete account dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Permanently delete your account?"
        description="All your simulation submissions, verified skills, and history will be wiped immediately."
        confirmLabel="Permanently delete"
        variant="danger"
        onConfirm={() => {
          toast.error("Account deletion requested");
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
};
