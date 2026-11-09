import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { SettingsLayout } from "@/components/recruiter/settings/SettingsLayout";
import { AccountPage, type AccountData } from "@/components/recruiter/settings/AccountPage";
import { UsersPage } from "@/components/recruiter/settings/UsersPage";
import { SubscriptionPage } from "@/components/recruiter/settings/SubscriptionPage";
import type { TeamUser, Plan, Usage, Invoice } from "@/lib/recruiterSettings";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

export const Route = createFileRoute("/recruiter/settings")({
  head: () => ({
    meta: [{ title: "Settings — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterSettingsPage,
});

const DEFAULT_PLANS: Plan[] = [
  { id: "starter", name: "Starter", submissions: 50, users: 2, evaluations: null },
  { id: "growth", name: "Growth", submissions: 150, users: 5, evaluations: null },
  { id: "scale", name: "Scale", submissions: 500, users: 10, evaluations: null },
];

function RecruiterSettingsPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [activeTab, setActiveTab] = useState<"account" | "users" | "subscription">("account");
  const [isOwner] = useState(true);

  // Account settings
  const [account, setAccount] = useState<AccountData>({
    company: "Yuvro Talent Co.",
    name: user?.name ?? "Recruiter",
    email: user?.email ?? "recruiter@yuvro.com",
    duration: "90 min",
    expiry: "14",
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "Asia/Kolkata",
    notif: { candidate: true, weekly: true, ai: false },
  });

  // Team users
  const [users, setUsers] = useState<TeamUser[]>([]);

  // Subscription data
  const [plans] = useState<Plan[]>(DEFAULT_PLANS);
  const [currentPlan, setCurrentPlan] = useState<Plan>(DEFAULT_PLANS[1]); // Growth
  const [billing] = useState<"monthly" | "yearly">("monthly");
  const [renewsAt, setRenewsAt] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [resetsAt, setResetsAt] = useState<string>(
    new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Load initial settings and check github tab redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "github" || params.get("installation_id")) {
        nav({ to: `/recruiter/github${window.location.search}` as any });
        return;
      }

      const tabParam = params.get("tab");
      if (tabParam === "users" || tabParam === "subscription" || tabParam === "account") {
        setActiveTab(tabParam);
      }

      // Load profile / workspace settings from localStorage
      try {
        const stored = localStorage.getItem("pl-recruiter-settings");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAccount((prev) => ({
            ...prev,
            company: parsed.org || parsed.company || prev.company,
            name: parsed.name || user?.name || prev.name,
            email: parsed.email || user?.email || prev.email,
            notif: parsed.notif || prev.notif,
            duration: parsed.duration || prev.duration,
            expiry: parsed.expiry || prev.expiry,
            timezone: parsed.timezone || prev.timezone,
          }));
        } else if (user) {
          setAccount((prev) => ({
            ...prev,
            name: user.name || prev.name,
            email: user.email || prev.email,
          }));
        }
      } catch (err) {
        console.error("Failed to parse settings", err);
      }

      // Load team users from localStorage
      try {
        const storedUsers = localStorage.getItem("pl-recruiter-team-users");
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        } else {
          const initialOwner: TeamUser = {
            id: user?.id || "u-owner",
            name: user?.name || "Recruiter",
            email: user?.email || "recruiter@yuvro.com",
            role: "owner",
            status: "active",
            addedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          };
          setUsers([initialOwner]);
          localStorage.setItem("pl-recruiter-team-users", JSON.stringify([initialOwner]));
        }
      } catch (err) {
        console.error("Failed to parse team users", err);
      }

      // Load subscription info
      async function loadSubscription() {
        try {
          const res = await yhubApiAuthUtil.get<any[]>("/payment/entitlements/");
          const productPlans = res.filter(
            (e: any) =>
              e.purchasable_item?.product === "ylabs" || e.purchasable_item?.item_type === "plan"
          );
          const activeItem =
            productPlans.find((e: any) => e.purchasable_item?.item_id !== "trial") ||
            productPlans[0];

          if (activeItem) {
            const itemId = activeItem.purchasable_item?.item_id;
            const matched = DEFAULT_PLANS.find((p) => p.id === itemId);
            if (matched) setCurrentPlan(matched);
            if (activeItem.revoked_at) setRenewsAt(activeItem.revoked_at);
            if (activeItem.expires_at) setResetsAt(activeItem.expires_at);
          }
        } catch {
          // Keep defaults if entitlements call fails
        }
      }
      loadSubscription();

      // Sample invoice
      setInvoices([
        {
          id: "inv-001",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 150 * 83, // INR equivalent
          url: "#",
        },
      ]);
    }
  }, [user, nav]);

  // Handle tab switch
  const handleTabChange = (tab: "account" | "users" | "subscription") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Save account & preferences
  const handleSaveAccount = async (val: {
    company: string;
    name: string;
    notif: { candidate: boolean; weekly: boolean; ai: boolean };
    duration: string;
    expiry: string;
    timezone: string;
  }) => {
    const updated = {
      ...account,
      company: val.company,
      name: val.name,
      notif: val.notif,
      duration: val.duration,
      expiry: val.expiry,
      timezone: val.timezone,
    };
    setAccount(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "pl-recruiter-settings",
        JSON.stringify({
          org: val.company,
          name: val.name,
          email: account.email,
          notif: val.notif,
          duration: val.duration,
          expiry: val.expiry,
          timezone: val.timezone,
        })
      );
    }

    try {
      if (val.name) {
        const parts = val.name.trim().split(" ");
        const first_name = parts[0];
        const last_name = parts.slice(1).join(" ") || "";
        await authService.updateUser({ first_name, last_name });
      }
    } catch {
      // Local changes still preserved
    }

    toast.success("Settings saved successfully");
  };

  // Change password
  const handleChangePassword = async (cur: string, next: string) => {
    try {
      await authService.changePassword({ currentPassword: cur, newPassword: next });
      toast.success("Password updated successfully");
    } catch (err: any) {
      if (
        err?.status === 400 ||
        err?.message?.toLowerCase().includes("current password") ||
        err?.message?.toLowerCase().includes("incorrect")
      ) {
        throw new Error("wrong_password");
      }
      throw new Error(err?.message || "Failed to update password. Please check your current password.");
    }
  };

  // Team user actions
  const handleInviteUser = async (email: string, role: "recruiter") => {
    const newUser: TeamUser = {
      id: `u-${Date.now()}`,
      name: email.split("@")[0],
      email: email.trim(),
      role,
      status: "invited",
      addedAt: new Date().toISOString(),
    };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    if (typeof window !== "undefined") {
      localStorage.setItem("pl-recruiter-team-users", JSON.stringify(nextUsers));
    }
    toast.success(`Invitation sent to ${email}`);
  };

  const handleResendInvite = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (target) {
      toast.success(`Invitation resent to ${target.email}`);
    }
  };

  const handleRemoveUser = async (id: string) => {
    const nextUsers = users.filter((u) => u.id !== id);
    setUsers(nextUsers);
    if (typeof window !== "undefined") {
      localStorage.setItem("pl-recruiter-team-users", JSON.stringify(nextUsers));
    }
    toast.success("User removed successfully");
  };

  // Subscription actions
  const handleUpgrade = (planId: string) => {
    nav({ to: "/recruiter/billing" });
  };

  const handleDowngrade = (planId: string) => {
    nav({ to: "/recruiter/billing" });
  };

  const handleChangeBillingEmail = () => {
    toast.info("To change your billing email, please reach out to billing@yuvro.com");
  };

  const handleContactSales = () => {
    window.location.href = "mailto:sales@yuvro.com?subject=Recruiter%20Custom%20Plan%20Inquiry";
  };

  const seatLimit = currentPlan.users ?? 5;
  const usage: Usage[] = [
    {
      key: "submissions",
      label: "Candidate submissions",
      used: 18,
      limit: currentPlan.submissions ?? 150,
    },
    {
      key: "users",
      label: "Recruiter seats",
      used: users.length,
      limit: seatLimit,
    },
    {
      key: "evaluations",
      label: "Active evaluations",
      used: 4,
      limit: currentPlan.evaluations,
    },
  ];

  return (
    <SettingsLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      isOwner={isOwner}
    >
      {activeTab === "account" && (
        <AccountPage
          account={account}
          isOwner={isOwner}
          onSave={handleSaveAccount}
          onChangePassword={handleChangePassword}
        />
      )}

      {activeTab === "users" && (
        <UsersPage
          users={users}
          limit={seatLimit}
          onInvite={handleInviteUser}
          onResend={handleResendInvite}
          onRemove={handleRemoveUser}
          onUpgradePlan={() => handleTabChange("subscription")}
        />
      )}

      {activeTab === "subscription" && (
        <SubscriptionPage
          plan={currentPlan}
          billing={billing}
          renewsAt={renewsAt}
          resetsAt={resetsAt}
          usage={usage}
          plans={plans}
          billingEmail={account.email}
          invoices={invoices}
          onUpgrade={handleUpgrade}
          onDowngrade={handleDowngrade}
          onChangeEmail={handleChangeBillingEmail}
          onContactSales={handleContactSales}
        />
      )}
    </SettingsLayout>
  );
}
