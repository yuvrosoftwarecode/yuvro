import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  passwordChangeSchema,
  PasswordChangeFormData,
} from "../schemas/settingsSchemas";
import { settingsApi } from "../api/settingsApi";
import { Device } from "../types";
import { Card } from "@/components/profile-ui/Card";
import { Field } from "@/components/profile-ui/Field";
import { Input } from "@/components/profile-ui/Input";
import { Button } from "@/components/profile-ui/Button";
import { TextLink } from "@/components/profile-ui/TextLink";
import { toast } from "@/lib/toastStore";
import { formatRelativeTime } from "@/lib/dateHelpers";
import {
  Shield,
  Laptop,
  Smartphone,
  AlertTriangle,
  Lock,
  LogOut,
  CheckCircle2,
} from "lucide-react";

export const SecuritySettings: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const loadDevices = async () => {
    try {
      const list = await settingsApi.getDevices();
      setDevices(list);
    } catch {
      toast.error("Failed to load active sessions");
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const onPasswordSubmit = async (data: PasswordChangeFormData) => {
    try {
      await settingsApi.changePassword(data);
      toast.success("Password updated successfully");
      reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };

  const handleRemoveDevice = async (id: string) => {
    try {
      await settingsApi.removeDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success("Device session logged out");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove session");
    }
  };

  const handleSignOutOthers = async () => {
    try {
      await settingsApi.signOutAllOtherDevices();
      setDevices((prev) => prev.filter((d) => d.isCurrent));
      toast.success("Signed out of all other devices");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out other devices");
    }
  };

  const handleDeleteAccount = async () => {
    if (deletePhrase !== "DELETE") {
      toast.error('Type "DELETE" to confirm account deletion');
      return;
    }
    setDeleting(true);
    try {
      await settingsApi.deleteAccount();
      toast.success("Account successfully scheduled for deletion");
      setDeleteConfirmOpen(false);
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card className="p-6 space-y-5">
        <div className="space-y-1 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Change Password</h2>
          </div>
          <p className="text-sm text-muted">
            Ensure your account is using a strong password with 8+ characters, uppercase, and numbers.
          </p>
        </div>

        <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md" noValidate>
          <Field
            id="security-current-pass"
            label="Current password"
            required
            error={errors.currentPassword?.message}
          >
            <Input
              id="security-current-pass"
              type="password"
              placeholder="••••••••••••"
              {...register("currentPassword")}
              error={!!errors.currentPassword}
            />
          </Field>

          <Field
            id="security-new-pass"
            label="New password"
            required
            hint="At least 8 characters, one uppercase, one number"
            error={errors.newPassword?.message}
          >
            <Input
              id="security-new-pass"
              type="password"
              placeholder="••••••••••••"
              {...register("newPassword")}
              error={!!errors.newPassword}
            />
          </Field>

          <Field
            id="security-confirm-pass"
            label="Confirm new password"
            required
            error={errors.confirmPassword?.message}
          >
            <Input
              id="security-confirm-pass"
              type="password"
              placeholder="••••••••••••"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
            />
          </Field>

          <div className="pt-2">
            <Button type="submit" size="md" loading={isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>

      {/* Where you're logged in (Devices) */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Where you're logged in</h2>
            </div>
            <p className="text-sm text-muted">
              Manage your active web and mobile sessions across different devices.
            </p>
          </div>

          {devices.filter((d) => !d.isCurrent).length > 0 && (
            <TextLink
              variant="muted"
              size="sm"
              icon={<LogOut className="h-3.5 w-3.5" />}
              onClick={handleSignOutOthers}
            >
              Sign out of all other devices
            </TextLink>
          )}
        </div>

        <div className="divide-y divide-line/60 rounded-input border border-line overflow-hidden">
          {devices.map((device) => {
            const isMobile =
              device.os.includes("iOS") || device.os.includes("Android");

            return (
              <div
                key={device.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-muted">
                    {isMobile ? (
                      <Smartphone className="h-5 w-5" />
                    ) : (
                      <Laptop className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">
                        {device.name}
                      </span>
                      {device.isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-subtle px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Current device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {device.browser} • {device.os} • {device.location} ({device.ip})
                    </p>
                    <p className="text-[11px] text-muted">
                      Last active: {formatRelativeTime(device.lastActive)}
                    </p>
                  </div>
                </div>

                {!device.isCurrent && (
                  <div className="self-end sm:self-auto">
                    <TextLink
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveDevice(device.id)}
                    >
                      Remove
                    </TextLink>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Delete Account (Danger Zone) */}
      <Card className="p-6 space-y-4 border-danger/30 bg-danger-subtle/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Danger Zone</h2>
          </div>
          <p className="text-sm text-muted">
            Permanently delete your Yuvro profile, verified task achievements, and interview data.
          </p>
        </div>

        {!deleteConfirmOpen ? (
          <div>
            <TextLink
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete account...
            </TextLink>
          </div>
        ) : (
          <div className="rounded-input border border-danger/40 bg-card p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-semibold text-danger">
              Are you sure? This action cannot be undone.
            </p>
            <p className="text-xs text-muted">
              Please type <span className="font-mono font-bold text-ink">DELETE</span> below to confirm.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 max-w-sm">
              <Input
                placeholder="DELETE"
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
                error={deletePhrase.length > 0 && deletePhrase !== "DELETE"}
              />
              <Button
                variant="danger"
                size="md"
                disabled={deletePhrase !== "DELETE" || deleting}
                loading={deleting}
                onClick={handleDeleteAccount}
              >
                Confirm Delete
              </Button>
              <TextLink
                variant="muted"
                size="sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeletePhrase("");
                }}
              >
                Cancel
              </TextLink>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
