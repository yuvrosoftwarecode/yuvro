import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import authService, { type ActiveSession } from "@/services/authService";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import {
  Github,
  Loader2,
  AlertCircle,
  Camera,
  UploadCloud,
  Trash2,
  Edit2,
  FileText,
  ExternalLink,
  Check,
  Laptop,
  Smartphone,
  LogOut,
  Link as LinkIcon,
  GraduationCap,
  Briefcase,
  X,
  ChevronDown,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/student/profile")({
  component: StudentProfileRedirect,
});

/**
 * The student's own profile lives at `/u/<userId>` (same URL that is shared
 * publicly). This legacy route forwards the logged-in user there.
 */
function StudentProfileRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id) {
      navigate({
        to: "/u/$userId",
        params: { userId: String(user.id) },
        replace: true,
      });
    }
  }, [mounted, user?.id, navigate]);

  if (mounted && !user?.id) {
    return <Profile />;
  }
  return (
    <div className="min-h-screen grid place-items-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const PROFILE_KEY = "yuvro-profile-overrides";
const EDUCATION_KEY = "yuvro-education";
const EMPLOYMENT_KEY = "yuvro-employment";
const LINKEDIN_KEY = "yuvro-linkedin";

const tabs = [
  "Personal info",
  "Education",
  "Employment",
  "Resume",
  "Connections",
  "Security",
] as const;
type Tab = (typeof tabs)[number];

type PersonalExtra = {
  phone: string;
  loc: string;
  web: string;
  about: string;
};

type Entry = {
  id: number;
  [key: string]: string | number;
};

const blankExtra: PersonalExtra = {
  phone: "",
  loc: "",
  web: "",
  about: "",
};

const configs = {
  Education: {
    subtitle: "Add your college, school or any course you have completed.",
    add: "Add education",
    empty: "No education added yet.",
    fields: [
      ["school", "School or college", "e.g. JNTU Hyderabad", true],
      ["degree", "Degree", "e.g. B.Tech", false],
      ["field", "Field of study", "e.g. Computer Science", false],
      ["start", "Start year", "2022", false],
      ["end", "End year (or expected)", "2026", false],
    ] as const,
  },
  Employment: {
    subtitle: "Internships and jobs, if you have any. Freshers can skip this.",
    add: "Add experience",
    empty: "No experience added. That’s completely fine.",
    fields: [
      ["company", "Company", "e.g. Acme Labs", true],
      ["role", "Role", "e.g. Backend Intern", true],
      ["start", "From", "Jun 2025", false],
      ["end", "To", "Present", false],
    ] as const,
  },
} as const;

const inputClass =
  "h-10 border-0 bg-muted shadow-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring";

const selectClass =
  "h-10 w-full appearance-none rounded-md border-0 bg-muted px-3 pr-8 text-sm text-foreground shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer";

const DEGREE_OPTIONS = [
  { value: "B.Tech", label: "B.Tech (Bachelor of Technology)" },
  { value: "B.E.", label: "B.E. (Bachelor of Engineering)" },
  { value: "B.Sc", label: "B.Sc (Bachelor of Science)" },
  { value: "BCA", label: "BCA (Bachelor of Computer Applications)" },
  { value: "B.Com", label: "B.Com (Bachelor of Commerce)" },
  { value: "BBA", label: "BBA (Bachelor of Business Administration)" },
  { value: "B.A.", label: "B.A. (Bachelor of Arts)" },
  { value: "M.Tech", label: "M.Tech (Master of Technology)" },
  { value: "M.E.", label: "M.E. (Master of Engineering)" },
  { value: "M.Sc", label: "M.Sc (Master of Science)" },
  { value: "MCA", label: "MCA (Master of Computer Applications)" },
  { value: "MBA", label: "MBA (Master of Business Administration)" },
  { value: "M.S.", label: "M.S. (Master of Science)" },
  { value: "M.A.", label: "M.A. (Master of Arts)" },
  { value: "Ph.D.", label: "Ph.D. / Doctorate" },
  { value: "Diploma", label: "Diploma / Polytechnic" },
  { value: "Associate Degree", label: "Associate Degree" },
  { value: "Intermediate / 12th", label: "Intermediate / 12th Standard" },
  { value: "Secondary / 10th", label: "Secondary / 10th Standard" },
  { value: "Other", label: "Other" },
];

const CURRENT_YEAR = new Date().getFullYear();
const START_YEARS = Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR + 2 - i));
const END_YEARS = [
  "Present",
  ...Array.from({ length: 55 }, (_, i) => String(CURRENT_YEAR + 8 - i)),
];

function parseUserAgent(): { browser: string; os: string; isMobile: boolean } {
  if (typeof window === "undefined" || !navigator.userAgent) {
    return { browser: "Chrome", os: "macOS", isMobile: false };
  }
  const ua = navigator.userAgent;
  let browser = "Web Browser";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";

  let os = "Desktop";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return { browser, os, isMobile };
}

export function Profile() {
  const { user, updateUser } = useAuth();
  const deviceInfo = useMemo(() => parseUserAgent(), []);

  /* ── Tab state ─────────────────────────────────────────── */
  const [tab, setTab] = useState<Tab>("Personal info");

  /* ── Account detail fields ─────────────────────────────── */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [personalExtra, setPersonalExtra] = useState<PersonalExtra>(blankExtra);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [webError, setWebError] = useState<string | null>(null);

  /* ── Password fields ───────────────────────────────────── */
  const [pwdMode, setPwdMode] = useState<"current" | "otp">("current");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  /* ── GitHub integration ────────────────────────────────── */
  const githubConnected = user?.github_connected ?? false;
  const githubHandle = user?.github_username ?? "";
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectInput, setDisconnectInput] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  /* ── LinkedIn connection ───────────────────────────────── */
  const [linkedinHandle, setLinkedinHandle] = useState("");
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
  const [linkedinInput, setLinkedinInput] = useState("");

  /* ── Image & Banner upload states (Crucial Logic) ───────── */
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [coverDropdownOpen, setCoverDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(profileRef, () => setProfileDropdownOpen(false));
  useClickOutside(coverRef, () => setCoverDropdownOpen(false));

  /* ── Hydration guard: images depend on localStorage user,
       which doesn't exist during SSR. Defer to avoid mismatch. ── */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const coverImage = mounted ? user?.cover_image : undefined;
  const profileImage = mounted ? user?.profile_image : undefined;

  /* ── Education & Employment lists ──────────────────────── */
  const [education, setEducation] = useState<Entry[]>([]);
  const [employment, setEmployment] = useState<Entry[]>([]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Record<string, string>>({});

  /* ── Resume states ─────────────────────────────────────── */
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [draggingResume, setDraggingResume] = useState(false);

  /* ── Notice toast ──────────────────────────────────────── */
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<number | null>(null);
  const showNotice = (msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 4000);
  };
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  /* ── Public profile sharing ────────────────────────────── */
  const [copiedLink, setCopiedLink] = useState(false);
  const handleShareProfile = async () => {
    if (!user?.id) {
      showNotice("Unable to generate profile link: User ID missing.");
      return;
    }
    const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://yuvrolabs.com";
    const profileUrl = `${origin}/u/${user.id}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = profileUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      showNotice(`Profile link copied to clipboard! (${profileUrl})`);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
      showNotice(`Profile link: ${profileUrl}`);
    }
  };

  /* ── Active sessions state ──────────────────────────────── */
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await authService.getActiveSessions();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e) {
      console.error("Failed to load active sessions:", e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (tab === "Security") {
      loadSessions();
    }
  }, [tab]);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showNotice("Session logged out.");
    } catch (e) {
      showNotice("Failed to log out session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      await authService.revokeAllOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      showNotice("All other sessions logged out.");
    } catch (e) {
      showNotice("Failed to log out of other sessions.");
    }
  };

  /* ── Initialise form from auth user & localStorage ─────── */
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setUsername(user.username ?? "");
      setEmail(user.email ?? "");
      if (Array.isArray(user.education) && user.education.length > 0) {
        setEducation(user.education as Entry[]);
      }
      if (Array.isArray(user.employment) && user.employment.length > 0) {
        setEmployment(user.employment as Entry[]);
      }
      setPersonalExtra((prev) => ({
        ...prev,
        phone: user.phone || prev.phone,
        loc: user.location || prev.loc,
        web: user.website || prev.web,
        about: user.about || user.profile?.about || prev.about,
      }));
    }
  }, [user]);

  useEffect(() => {
    try {
      const rawEdu = localStorage.getItem(EDUCATION_KEY);
      if (rawEdu) {
        setEducation((prev) => (prev.length ? prev : JSON.parse(rawEdu)));
      }
    } catch {
      /* Browser storage unavailable */
    }
    try {
      const rawEmp = localStorage.getItem(EMPLOYMENT_KEY);
      if (rawEmp) {
        setEmployment((prev) => (prev.length ? prev : JSON.parse(rawEmp)));
      }
    } catch {
      /* Browser storage unavailable */
    }
    try {
      const rawLinkedin = localStorage.getItem(LINKEDIN_KEY);
      if (rawLinkedin) setLinkedinHandle(rawLinkedin);
    } catch {
      /* Browser storage unavailable */
    }
    try {
      const rawOverrides = localStorage.getItem(PROFILE_KEY);
      if (rawOverrides) {
        const parsed = JSON.parse(rawOverrides);
        setPersonalExtra((prev) => ({
          ...prev,
          phone: parsed.phone ?? prev.phone,
          loc: parsed.loc ?? prev.loc,
          web: parsed.web ?? prev.web,
          about: parsed.about ?? prev.about,
        }));
      }
    } catch {
      /* Browser storage unavailable */
    }
  }, []);

  /* ── Display name derivation ───────────────────────────── */
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || username || me.name;
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  /* ── Validation helpers ───────────────────────────────── */
  const validatePhone = (value: string): string | null => {
    const clean = value.trim();
    if (!clean) return null;
    if (!clean.startsWith("+")) {
      return "Country code is required and must start with '+' (e.g. +91 98765 43210)";
    }
    if (!/^\+[0-9\s\-()]+$/.test(clean)) {
      return "Phone number contains invalid characters";
    }
    const digits = clean.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return "Please enter a valid phone number with country code (8 to 15 digits)";
    }
    return null;
  };

  const validateWebsite = (value: string): string | null => {
    const clean = value.trim();
    if (!clean) return null;
    if (!clean.startsWith("https://")) {
      return "Website URL must start with 'https://' (e.g. https://yourname.dev)";
    }
    try {
      const url = new URL(clean);
      if (!url.hostname.includes(".") || url.hostname.endsWith(".")) {
        return "Please enter a valid domain name (e.g. https://yourname.dev)";
      }
    } catch {
      return "Please enter a valid URL starting with https://";
    }
    return null;
  };

  /* ── Save profile (calls backend & stores extra details) ── */
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const phoneErr = validatePhone(personalExtra.phone);
    setPhoneError(phoneErr);
    if (phoneErr) {
      setSaveError(phoneErr);
      return;
    }

    const webErr = validateWebsite(personalExtra.web);
    setWebError(webErr);
    if (webErr) {
      setSaveError(webErr);
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateUser({
        first_name: firstName,
        last_name: lastName,
        username,
        phone: personalExtra.phone,
        location: personalExtra.loc,
        website: personalExtra.web,
        about: personalExtra.about,
      });
      updateUser(updated);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(personalExtra));
      } catch {
        /* storage fallback */
      }
      showNotice("Profile changes saved.");
    } catch (err: any) {
      const msg =
        err?.data?.detail ??
        err?.data?.username?.[0] ??
        err?.message ??
        "Failed to save. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Resend OTP timer effect ───────────────────────────── */
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = window.setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [resendTimer]);

  /* ── Send OTP for password change ──────────────────────── */
  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setPwdMsg(null);
    try {
      const res = await authService.sendChangePasswordOtp();
      setOtpSent(true);
      setResendTimer(60);
      showNotice(res.message || "OTP sent to your email.");
    } catch (err: any) {
      const msg =
        err?.data?.error ??
        err?.message ??
        "Failed to send OTP. Please try again.";
      setPwdMsg({ ok: false, text: msg });
    } finally {
      setIsSendingOtp(false);
    }
  };

  /* ── Change password (via YHub backend) ────────────────── */
  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (pwdMode === "current" && !currentPwd) {
      setPwdMsg({ ok: false, text: "Enter your current password." });
      return;
    }
    if (pwdMode === "otp" && !otpCode.trim()) {
      setPwdMsg({ ok: false, text: "Enter the 6-digit OTP code sent to your email." });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({
        ok: false,
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: "New passwords don't match." });
      return;
    }

    setPwdSaving(true);
    try {
      await authService.changePassword({
        currentPassword: pwdMode === "current" ? currentPwd : undefined,
        otp: pwdMode === "otp" ? otpCode.trim() : undefined,
        newPassword: newPwd,
      });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setOtpCode("");
      setOtpSent(false);
      setPwdMsg({ ok: true, text: "Password updated successfully." });
      showNotice("Password updated successfully.");
      setTimeout(() => {
        setPwdMsg(null);
        setPasswordOpen(false);
      }, 2500);
    } catch (err: any) {
      const msg =
        err?.data?.error ??
        err?.data?.detail ??
        err?.data?.current_password?.[0] ??
        err?.data?.new_password?.[0] ??
        err?.message ??
        "Failed to update password.";
      setPwdMsg({ ok: false, text: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── GitHub connect / disconnect ───────────────────────── */
  const connectGithub = async () => {
    try {
      const { yhubApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>(
        "/auth/github/connect/",
      );
      if (data.authorization_url) window.location.href = data.authorization_url;
    } catch (e) {
      console.error("Failed to fetch github connect url", e);
      showNotice("Failed to initiate GitHub connection.");
    }
  };

  const initiateDisconnect = () => {
    setDisconnectInput("");
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    if (disconnectInput !== githubHandle) return;
    setDisconnecting(true);
    try {
      const { yhubApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
      await yhubApiAuthUtil.delete("/auth/github/connect/");
      const updatedUser = await authService.getCurrentUser();
      updateUser(updatedUser);
      setShowDisconnectModal(false);
      showNotice("GitHub account disconnected.");
    } catch (e) {
      console.error("Failed to disconnect github", e);
      showNotice("Failed to disconnect GitHub account.");
    } finally {
      setDisconnecting(false);
    }
  };

  /* ── Image & Banner upload handlers (Protected Logic) ───── */
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "profile_image" | "cover_image",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotice("Please choose a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotice("Please choose an image under 2 MB.");
      return;
    }

    const setUploading =
      field === "profile_image" ? setIsUploadingProfile : setIsUploadingCover;
    setUploading(true);

    try {
      const updatedUser = await authService.uploadProfileImage(file, field);
      updateUser(updatedUser);
      if (field === "profile_image") setProfileDropdownOpen(false);
      else setCoverDropdownOpen(false);
      showNotice(
        `${field === "profile_image" ? "Profile photo" : "Cover banner"} updated successfully.`,
      );
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
      showNotice("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (field: "profile_image" | "cover_image") => {
    const setUploading =
      field === "profile_image" ? setIsUploadingProfile : setIsUploadingCover;
    setUploading(true);

    try {
      const updatedUser = await authService.removeProfileImage(field);
      updateUser(updatedUser);
      if (field === "profile_image") setProfileDropdownOpen(false);
      else setCoverDropdownOpen(false);
      showNotice(
        `${field === "profile_image" ? "Profile photo" : "Cover banner"} removed.`,
      );
    } catch (err) {
      console.error(`Failed to remove ${field}:`, err);
      showNotice("Failed to remove image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /* ── Resume handlers ───────────────────────────────────── */
  const handleResumeFileSelected = async (file?: File) => {
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      showNotice("Please choose a valid PDF, DOC or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotice("Please choose a file under 5 MB.");
      return;
    }

    setIsUploadingResume(true);
    try {
      const updatedUser = await authService.uploadResume(file);
      updateUser(updatedUser);
      showNotice("Resume uploaded successfully.");
    } catch (err) {
      console.error("Failed to upload resume:", err);
      showNotice("Failed to upload resume. Please try again.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleRemoveResume = async () => {
    setIsUploadingResume(true);
    try {
      const updatedUser = await authService.removeResume();
      updateUser(updatedUser);
      showNotice("Resume removed.");
    } catch (err) {
      console.error("Failed to remove resume:", err);
      showNotice("Failed to remove resume. Please try again.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  /* ── Education & Employment entry actions ──────────────── */
  const isList = tab === "Education" || tab === "Employment";
  const config = isList ? configs[tab] : null;
  const entries = tab === "Education" ? education : employment;
  const setEntries = tab === "Education" ? setEducation : setEmployment;

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEntry(true);
    try {
      let next: Entry[];
      if (editingId) {
        next = entries.map((item) =>
          item.id === editingId ? { ...item, ...newEntry } : item,
        );
      } else {
        next = [...entries, { ...newEntry, id: Date.now() }];
      }
      setEntries(next);

      // Persist to backend user record
      const payload =
        tab === "Education" ? { education: next } : { employment: next };
      const updated = await authService.updateUser(payload);
      updateUser(updated);

      try {
        localStorage.setItem(
          tab === "Education" ? EDUCATION_KEY : EMPLOYMENT_KEY,
          JSON.stringify(next),
        );
      } catch {
        /* Browser storage fallback */
      }

      setAddingEntry(false);
      setEditingId(null);
      setNewEntry({});
      showNotice(
        `${tab === "Education" ? "Education" : "Experience"} ${
          editingId ? "updated" : "added"
        } successfully.`,
      );
    } catch (err) {
      console.error("Failed to save entry:", err);
      showNotice("Saved locally.");
      setAddingEntry(false);
      setEditingId(null);
      setNewEntry({});
    } finally {
      setIsSavingEntry(false);
    }
  };

  const removeEntry = async (id: number | string) => {
    const next = entries.filter((x) => x.id !== id);
    setEntries(next);

    try {
      const payload =
        tab === "Education" ? { education: next } : { employment: next };
      const updated = await authService.updateUser(payload);
      updateUser(updated);

      try {
        localStorage.setItem(
          tab === "Education" ? EDUCATION_KEY : EMPLOYMENT_KEY,
          JSON.stringify(next),
        );
      } catch {
        /* Browser storage fallback */
      }
      showNotice("Entry removed.");
    } catch (err) {
      console.error("Failed to remove entry from server:", err);
      showNotice("Entry removed.");
    }
  };

  const startEditEntry = (item: Entry) => {
    const data: Record<string, string> = {};
    Object.keys(item).forEach((k) => {
      if (k !== "id") data[k] = String(item[k]);
    });
    setNewEntry(data);
    setEditingId(item.id);
    setAddingEntry(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />

      {/* Hidden inputs for direct triggers */}
      <input
        ref={profileInputRef}
        type="file"
        accept="image/*"
        aria-label="Choose profile photo"
        className="hidden"
        onChange={(e) => handleImageUpload(e, "profile_image")}
        disabled={isUploadingProfile}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        aria-label="Choose cover banner"
        className="hidden"
        onChange={(e) => handleImageUpload(e, "cover_image")}
        disabled={isUploadingCover}
      />

      <main className="mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-8 sm:py-10">
        {/* ── Banner & Avatar Hero Header (Crucial logic protected) ── */}
        <header
          className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-8 flex flex-col justify-end min-h-[220px] overflow-hidden shadow-xs"
          style={
            coverImage
              ? {
                  backgroundImage: `url(${coverImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Subtle dark overlay if cover exists for high text contrast */}
          {coverImage && (
            <div className="absolute inset-0 bg-black/45 rounded-2xl pointer-events-none" />
          )}

          {/* Header Action Buttons (Top-Right) */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {/* Cover Action Button */}
            {!coverImage ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="h-8 gap-1.5 bg-background/85 hover:bg-background/95 text-foreground backdrop-blur-sm shadow-xs text-xs font-medium cursor-pointer"
              >
                {isUploadingCover ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="size-3.5" />
                )}
                {isUploadingCover ? "Uploading…" : "Upload cover"}
              </Button>
            ) : (
              <div className="relative" ref={coverRef}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setCoverDropdownOpen(!coverDropdownOpen)}
                  disabled={isUploadingCover}
                  className="h-8 gap-1.5 bg-background/85 hover:bg-background/95 text-foreground backdrop-blur-sm shadow-xs text-xs font-medium cursor-pointer"
                >
                  {isUploadingCover ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Edit2 className="size-3.5" />
                  )}
                  {isUploadingCover ? "Updating…" : "Edit cover"}
                </Button>
                {coverDropdownOpen && (
                  <div className="absolute right-0 top-full pt-1.5 z-30">
                    <div className="w-36 bg-popover text-popover-foreground border rounded-lg shadow-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCoverDropdownOpen(false);
                          coverInputRef.current?.click();
                        }}
                        className="px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Camera className="size-3.5" /> Change
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("cover_image")}
                        className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 text-left flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Avatar & Info Row */}
          <div className="relative z-20 flex flex-wrap items-center gap-5 sm:gap-6">
            {/* Avatar with Upload / Edit controls */}
            <div className="relative group/avatar" ref={profileRef}>
              <div
                onClick={() => {
                  if (!profileImage) {
                    profileInputRef.current?.click();
                  } else {
                    setProfileDropdownOpen((prev) => !prev);
                  }
                }}
                className="relative grid size-20 sm:size-24 place-items-center overflow-hidden rounded-full border-4 border-background bg-primary text-3xl font-medium text-primary-foreground shadow-md shrink-0 cursor-pointer"
                title={profileImage ? "Click to edit photo" : "Click to upload photo"}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
                {/* Overlay camera icon on hover */}
                <div className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera className="size-5 sm:size-6 text-white" />
                </div>
                {isUploadingProfile && (
                  <div className="absolute inset-0 bg-black/50 grid place-items-center">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Sleek circular camera button badge at bottom-right */}
              <div className="absolute bottom-0 right-0 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!profileImage) {
                      profileInputRef.current?.click();
                    } else {
                      setProfileDropdownOpen((prev) => !prev);
                    }
                  }}
                  disabled={isUploadingProfile}
                  className="size-7 sm:size-8 rounded-full bg-background border-2 border-card shadow-md grid place-items-center text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-transform hover:scale-105"
                  title={profileImage ? "Edit profile photo" : "Upload profile photo"}
                >
                  <Camera className="size-3.5 sm:size-4" />
                </button>

                {/* Profile Image Dropdown (positioned just side to the cam button) */}
                {profileImage && profileDropdownOpen && (
                  <div className="absolute left-full bottom-0 ml-2.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <div className="w-36 bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden flex flex-col py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          profileInputRef.current?.click();
                        }}
                        className="px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-left cursor-pointer transition-colors"
                      >
                        <Camera className="size-3.5" /> Change photo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage("profile_image")}
                        className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 text-left flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Trash2 className="size-3.5" /> Remove photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display Name and Level */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className={`break-words text-2xl sm:text-3xl font-semibold tracking-tight ${
                    coverImage ? "text-white" : "text-foreground"
                  }`}
                >
                  {displayName || "Your name"}
                </h1>
                <button
                  type="button"
                  onClick={handleShareProfile}
                  title="Copy profile link"
                  aria-label="Copy profile link"
                  className={`size-8 rounded-full grid place-items-center transition-colors cursor-pointer shrink-0 ${
                    coverImage
                      ? "text-white/85 hover:text-white bg-black/25 hover:bg-black/40"
                      : "text-muted-foreground hover:text-foreground bg-accent/60 hover:bg-accent"
                  }`}
                >
                  {copiedLink ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                </button>
              </div>
              <p
                className={`mt-0.5 text-sm ${
                  coverImage ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {email || username}
              </p>
            </div>
          </div>
        </header>

        {/* ── Two-Column Layout with Tabs and Card ──────────── */}
        <div className="mt-8 grid items-start gap-7 md:grid-cols-[180px_minmax(0,1fr)] md:gap-10">
          {/* Navigation Sidebar */}
          <nav
            aria-label="Profile sections"
            className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:pb-0"
          >
            {tabs.map((item) => (
              <Button
                key={item}
                variant="ghost"
                aria-current={tab === item ? "page" : undefined}
                className={`h-10 justify-start px-4 text-sm font-medium transition-colors ${
                  tab === item
                    ? "bg-accent text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setTab(item);
                  setAddingEntry(false);
                  setNewEntry({});
                  setConnectingLinkedIn(false);
                }}
              >
                {item}
              </Button>
            ))}
          </nav>

          {/* Active Tab Panel */}
          <section
            className="min-w-0 rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs"
            aria-label={tab}
          >
            {/* 1. Personal Info Tab */}
            {tab === "Personal info" && (
              <>
                <Heading
                  title="Personal information"
                  subtitle="Fields marked * are required."
                />
                <form onSubmit={saveProfile}>
                  <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="First name" required>
                      <Input
                        className={inputClass}
                        required
                        placeholder="Your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </Field>
                    <Field label="Last name">
                      <Input
                        className={inputClass}
                        placeholder="Your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </Field>
                    <Field label="Username" required>
                      <Input
                        className={inputClass}
                        required
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </Field>
                    <Field label="Email" required>
                      <Input
                        className={`${inputClass} opacity-60 cursor-not-allowed`}
                        type="email"
                        required
                        readOnly
                        disabled
                        value={email}
                        title="Email cannot be changed"
                      />
                    </Field>
                    <Field
                      label="Phone"
                      hint="Include country code (+...)"
                      error={phoneError}
                    >
                      <Input
                        className={`${inputClass} ${phoneError ? "border-destructive ring-1 ring-destructive" : ""}`}
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={personalExtra.phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPersonalExtra((p) => ({ ...p, phone: val }));
                          if (phoneError) setPhoneError(validatePhone(val));
                        }}
                        onBlur={() => setPhoneError(validatePhone(personalExtra.phone))}
                      />
                    </Field>
                    <Field label="Location">
                      <Input
                        className={inputClass}
                        placeholder="City, Country"
                        value={personalExtra.loc}
                        onChange={(e) =>
                          setPersonalExtra((p) => ({ ...p, loc: e.target.value }))
                        }
                      />
                    </Field>
                    <Field
                      label="Website"
                      hint="https:// mandatory"
                      error={webError}
                    >
                      <Input
                        className={`${inputClass} ${webError ? "border-destructive ring-1 ring-destructive" : ""}`}
                        placeholder="https://yourname.dev"
                        value={personalExtra.web}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPersonalExtra((p) => ({ ...p, web: val }));
                          if (webError) setWebError(validateWebsite(val));
                        }}
                        onBlur={() => setWebError(validateWebsite(personalExtra.web))}
                      />
                    </Field>
                    <Field label="About you" className="sm:col-span-2">
                      <Textarea
                        className="min-h-28 border-0 bg-muted shadow-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="A line or two about what you are learning and building."
                        value={personalExtra.about}
                        onChange={(e) =>
                          setPersonalExtra((p) => ({ ...p, about: e.target.value }))
                        }
                      />
                    </Field>
                  </div>

                  {saveError && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="size-4 shrink-0" /> {saveError}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {/* 2 & 3. Education / Employment Tab */}
            {isList && config && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-medium tracking-tight">
                      {tab}
                      {tab === "Employment" && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          Optional
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {config.subtitle}
                    </p>
                  </div>
                  {!addingEntry && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setNewEntry({});
                        setAddingEntry(true);
                      }}
                      className="cursor-pointer gap-1.5"
                    >
                      <span>+ {config.add}</span>
                    </Button>
                  )}
                </div>

                {entries.length > 0 && !addingEntry ? (
                  <div className="space-y-3">
                    {entries.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-border hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                            {tab === "Education" ? (
                              <GraduationCap className="size-5" />
                            ) : (
                              <Briefcase className="size-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words text-sm font-semibold text-foreground">
                              {tab === "Education" ? item.school : item.role}
                            </h3>
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">
                              {[
                                tab === "Education"
                                  ? [item.degree, item.field].filter(Boolean).join(" · ")
                                  : item.company,
                                [item.start, item.end].filter(Boolean).join(" – "),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => startEditEntry(item)}
                          >
                            <Edit2 className="size-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => removeEntry(item.id)}
                          >
                            <Trash2 className="size-3.5" />
                            <span>Remove</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !addingEntry ? (
                  <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
                    <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
                      {tab === "Education" ? (
                        <GraduationCap className="size-6" />
                      ) : (
                        <Briefcase className="size-6" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">{config.empty}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add details to highlight your background on your profile.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 cursor-pointer gap-1"
                      onClick={() => {
                        setEditingId(null);
                        setNewEntry({});
                        setAddingEntry(true);
                      }}
                    >
                      + {config.add}
                    </Button>
                  </div>
                ) : null}

                {addingEntry && (
                  <form onSubmit={saveEntry} className="rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between pb-3 border-b border-border/60">
                      <h3 className="text-sm font-semibold text-foreground">
                        {editingId
                          ? `Edit ${tab === "Education" ? "Education" : "Experience"}`
                          : `Add ${tab === "Education" ? "Education" : "Experience"}`}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Fields marked * are required
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {config.fields.map(([key, label, placeholder, required]) => {
                        const isSpan2 = key === "school" || key === "company";

                        if (key === "degree") {
                          const currentDegree = (newEntry.degree as string) || "";
                          const isKnown = DEGREE_OPTIONS.some((opt) => opt.value === currentDegree);
                          const selectValue = isKnown ? currentDegree : currentDegree ? "Other" : "";

                          return (
                            <Field
                              key={key}
                              label={label}
                              required={required}
                              className={isSpan2 ? "sm:col-span-2" : ""}
                            >
                              <div className="relative">
                                <select
                                  value={selectValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNewEntry((v) => ({ ...v, degree: val }));
                                  }}
                                  className={cn(
                                    selectClass,
                                    !selectValue && "text-muted-foreground/60"
                                  )}
                                >
                                  <option value="" className="bg-card text-muted-foreground">
                                    Select degree...
                                  </option>
                                  {DEGREE_OPTIONS.map((opt) => (
                                    <option
                                      key={opt.value}
                                      value={opt.value}
                                      className="bg-card text-foreground py-1"
                                    >
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-60" />
                              </div>

                              {selectValue === "Other" && (
                                <div className="mt-2">
                                  <Input
                                    className={inputClass}
                                    placeholder="Specify your degree (e.g. Dual Degree, Specialization)"
                                    value={currentDegree === "Other" ? "" : currentDegree}
                                    onChange={(e) =>
                                      setNewEntry((v) => ({
                                        ...v,
                                        degree: e.target.value || "Other",
                                      }))
                                    }
                                    autoFocus
                                  />
                                </div>
                              )}
                            </Field>
                          );
                        }

                        if (key === "start") {
                          const currentStart = (newEntry.start as string) || "";
                          const isCustomStart =
                            currentStart && !START_YEARS.includes(currentStart);

                          return (
                            <Field
                              key={key}
                              label={label}
                              required={required}
                              className={isSpan2 ? "sm:col-span-2" : ""}
                            >
                              <div className="relative">
                                <select
                                  value={currentStart}
                                  onChange={(e) =>
                                    setNewEntry((v) => ({ ...v, start: e.target.value }))
                                  }
                                  className={cn(
                                    selectClass,
                                    !currentStart && "text-muted-foreground/60"
                                  )}
                                >
                                  <option value="" className="bg-card text-muted-foreground">
                                    Select start year...
                                  </option>
                                  {isCustomStart && (
                                    <option
                                      value={currentStart}
                                      className="bg-card text-foreground py-1"
                                    >
                                      {currentStart}
                                    </option>
                                  )}
                                  {START_YEARS.map((yr) => (
                                    <option
                                      key={yr}
                                      value={yr}
                                      className="bg-card text-foreground py-1"
                                    >
                                      {yr}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-60" />
                              </div>
                            </Field>
                          );
                        }

                        if (key === "end") {
                          const currentEnd = (newEntry.end as string) || "";
                          const isCustomEnd =
                            currentEnd && !END_YEARS.includes(currentEnd);

                          return (
                            <Field
                              key={key}
                              label={label}
                              required={required}
                              className={isSpan2 ? "sm:col-span-2" : ""}
                            >
                              <div className="relative">
                                <select
                                  value={currentEnd}
                                  onChange={(e) =>
                                    setNewEntry((v) => ({ ...v, end: e.target.value }))
                                  }
                                  className={cn(
                                    selectClass,
                                    !currentEnd && "text-muted-foreground/60"
                                  )}
                                >
                                  <option value="" className="bg-card text-muted-foreground">
                                    {tab === "Education"
                                      ? "Select end year (or expected)..."
                                      : "Select end year or Present..."}
                                  </option>
                                  {isCustomEnd && (
                                    <option
                                      value={currentEnd}
                                      className="bg-card text-foreground py-1"
                                    >
                                      {currentEnd}
                                    </option>
                                  )}
                                  {END_YEARS.map((yr) => (
                                    <option
                                      key={yr}
                                      value={yr}
                                      className="bg-card text-foreground py-1"
                                    >
                                      {yr}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-60" />
                              </div>
                            </Field>
                          );
                        }

                        return (
                          <Field
                            key={key}
                            label={label}
                            required={required}
                            className={isSpan2 ? "sm:col-span-2" : ""}
                          >
                            <Input
                              required={required}
                              className={inputClass}
                              placeholder={placeholder}
                              value={(newEntry[key] as string) || ""}
                              onChange={(e) =>
                                setNewEntry((v) => ({ ...v, [key]: e.target.value }))
                              }
                            />
                          </Field>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        disabled={isSavingEntry}
                        onClick={() => {
                          setAddingEntry(false);
                          setEditingId(null);
                          setNewEntry({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={isSavingEntry}>
                        {isSavingEntry && <Loader2 className="size-3.5 animate-spin" />}
                        {isSavingEntry
                          ? "Saving…"
                          : editingId
                          ? "Save changes"
                          : "Save entry"}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* 4. Resume Tab */}
            {tab === "Resume" && (
              <>
                <Heading
                  title="Resume"
                  subtitle="Upload your resume document. You can preview it in-app, replace, or download it."
                />
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  aria-label="Choose resume"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleResumeFileSelected(file);
                    e.target.value = "";
                  }}
                  disabled={isUploadingResume}
                />

                {isUploadingResume ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/40 p-12 text-center">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Uploading resume to server…
                    </p>
                  </div>
                ) : user?.resume_file ? (
                  <div className="space-y-4">
                    {/* Resume Header Card with Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <FileText className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {user.resume_file.split("/").pop() || "Resume Document"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Active resume document for evaluations & applications
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                          onClick={() => resumeInputRef.current?.click()}
                        >
                          <UploadCloud className="size-3.5" />
                          <span>Replace</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          onClick={handleRemoveResume}
                        >
                          <Trash2 className="size-3.5" />
                          <span>Remove</span>
                        </Button>
                      </div>
                    </div>

                    {/* Resume Document Preview */}
                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                      <div className="relative h-[720px] w-full bg-muted/10">
                        <iframe
                          src={`${user.resume_file}#toolbar=0&navpanes=0&view=FitH`}
                          title="Resume Preview"
                          className="size-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingResume(true);
                    }}
                    onDragLeave={() => setDraggingResume(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingResume(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleResumeFileSelected(file);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-lg border border-dashed px-5 py-10 text-center transition-colors ${
                      draggingResume
                        ? "border-primary bg-accent/60"
                        : "border-border bg-muted/60"
                    }`}
                  >
                    <UploadCloud className="size-8 text-muted-foreground/80 mb-1" />
                    <h3 className="text-sm font-medium">No resume yet</h3>
                    <p className="text-xs text-muted-foreground">
                      Drag a file here, or pick one from your device (PDF, DOC, DOCX up to 5 MB).
                    </p>
                    <Button
                      variant="link"
                      className="mt-1 h-auto p-0 text-sm font-medium"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      Upload resume
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* 5. Connections Tab */}
            {tab === "Connections" && (
              <>
                <Heading
                  title="Connections"
                  subtitle="Add your account links so your work shows up on your profile."
                />
                <div className="divide-y divide-border">
                  {/* GitHub Item */}
                  <div className="flex flex-wrap items-start justify-between gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Github className="size-4.5" />
                        <h3 className="text-sm font-medium">GitHub</h3>
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {githubConnected ? (
                          <a
                            className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            href={`https://github.com/${encodeURIComponent(githubHandle)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            github.com/{githubHandle}{" "}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "Show your repositories, commits, and power lab integrations."
                        )}
                      </p>
                    </div>
                    {githubConnected ? (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-destructive text-sm font-medium"
                        onClick={initiateDisconnect}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-primary text-sm font-medium"
                        onClick={connectGithub}
                      >
                        Connect
                      </Button>
                    )}
                  </div>

                  {/* LinkedIn Item */}
                  <div className="flex flex-wrap items-start justify-between gap-4 py-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="size-4.5" />
                        <h3 className="text-sm font-medium">LinkedIn</h3>
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {linkedinHandle ? (
                          <a
                            className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                            href={`https://linkedin.com/in/${encodeURIComponent(linkedinHandle)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            linkedin.com/in/{linkedinHandle}{" "}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "Add your professional profile link."
                        )}
                      </p>
                      {connectingLinkedIn && (
                        <form
                          className="mt-4 flex flex-wrap gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const clean = linkedinInput
                              .trim()
                              .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")
                              .replace(/\/$/, "")
                              .replace(/^@/, "");
                            if (!clean) return;
                            setLinkedinHandle(clean);
                            try {
                              localStorage.setItem(LINKEDIN_KEY, clean);
                            } catch {
                              /* storage fallback */
                            }
                            setConnectingLinkedIn(false);
                            showNotice("LinkedIn profile link saved.");
                          }}
                        >
                          <Input
                            className={`${inputClass} min-w-0 flex-1 max-w-sm`}
                            aria-label="LinkedIn username"
                            required
                            value={linkedinInput}
                            onChange={(e) => setLinkedinInput(e.target.value)}
                            placeholder="username or profile link"
                          />
                          <Button
                            variant="link"
                            className="px-0 font-medium"
                            type="submit"
                          >
                            Link
                          </Button>
                          <Button
                            variant="link"
                            className="px-0 text-muted-foreground"
                            type="button"
                            onClick={() => setConnectingLinkedIn(false)}
                          >
                            Cancel
                          </Button>
                        </form>
                      )}
                    </div>
                    {linkedinHandle ? (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-destructive text-sm font-medium"
                        onClick={() => {
                          setLinkedinHandle("");
                          try {
                            localStorage.removeItem(LINKEDIN_KEY);
                          } catch {
                            /* storage fallback */
                          }
                          showNotice("LinkedIn profile unlinked.");
                        }}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      !connectingLinkedIn && (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary text-sm font-medium"
                          onClick={() => {
                            setConnectingLinkedIn(true);
                            setLinkedinInput("");
                          }}
                        >
                          Connect
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 6. Security Tab */}
            {tab === "Security" && (
              <>
                <Heading title="Security" subtitle="Keep your account safe." />

                <div className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <h3 className="text-sm font-medium">Password</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use a strong password you don’t reuse elsewhere. Managed securely by YHub.
                    </p>
                  </div>
                  <Button
                    variant="link"
                    className="h-auto whitespace-normal p-0 text-right text-sm font-medium"
                    onClick={() => setPasswordOpen((v) => !v)}
                  >
                    {passwordOpen ? "Cancel" : "Change password"}
                  </Button>
                </div>

                {passwordOpen && (
                  <form onSubmit={updatePassword} className="mt-4 border-t border-border pt-5">
                    {/* Method Selector Tabs */}
                    <div className="mb-5 flex rounded-lg bg-muted p-1 max-w-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setPwdMode("current");
                          setPwdMsg(null);
                        }}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer",
                          pwdMode === "current"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Using old password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPwdMode("otp");
                          setPwdMsg(null);
                        }}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer",
                          pwdMode === "otp"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Using email OTP
                      </button>
                    </div>

                    {pwdMode === "current" ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Current password" required className="sm:col-span-2">
                          <Input
                            className={inputClass}
                            type="password"
                            autoComplete="current-password"
                            value={currentPwd}
                            onChange={(e) => setCurrentPwd(e.target.value)}
                            placeholder="Enter your current password"
                            required
                          />
                        </Field>
                        <Field label="New password" required>
                          <Input
                            className={inputClass}
                            type="password"
                            autoComplete="new-password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            placeholder="Min. 8 characters"
                            required
                          />
                        </Field>
                        <Field label="Confirm new password" required>
                          <Input
                            className={inputClass}
                            type="password"
                            autoComplete="new-password"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                          />
                        </Field>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">
                                Verify via registered email
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                We will send a 6-digit code to{" "}
                                <span className="font-medium text-foreground">
                                  {user?.email || email}
                                </span>
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={otpSent ? "outline" : "default"}
                              onClick={handleSendOtp}
                              disabled={isSendingOtp || resendTimer > 0}
                              className="h-8 gap-1.5 text-xs cursor-pointer shrink-0"
                            >
                              {isSendingOtp ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : null}
                              {isSendingOtp
                                ? "Sending code…"
                                : resendTimer > 0
                                ? `Resend code (${resendTimer}s)`
                                : otpSent
                                ? "Resend OTP"
                                : "Send OTP"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 pt-1">
                          <Field
                            label="6-Digit OTP Code"
                            required
                            className="sm:col-span-2"
                            hint={otpSent ? "Check your email inbox for the code" : undefined}
                          >
                            <Input
                              className={inputClass}
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                              placeholder="Enter 6-digit OTP code"
                              required
                            />
                          </Field>
                          <Field label="New password" required>
                            <Input
                              className={inputClass}
                              type="password"
                              autoComplete="new-password"
                              value={newPwd}
                              onChange={(e) => setNewPwd(e.target.value)}
                              placeholder="Min. 8 characters"
                              required
                            />
                          </Field>
                          <Field label="Confirm new password" required>
                            <Input
                              className={inputClass}
                              type="password"
                              autoComplete="new-password"
                              value={confirmPwd}
                              onChange={(e) => setConfirmPwd(e.target.value)}
                              placeholder="Re-enter new password"
                              required
                            />
                          </Field>
                        </div>
                      </div>
                    )}

                    {pwdMsg && (
                      <div
                        className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium ${
                          pwdMsg.ok
                            ? "text-green-600 dark:text-green-400"
                            : "text-destructive"
                        }`}
                      >
                        {pwdMsg.ok ? (
                          <Check className="size-3.5" />
                        ) : (
                          <AlertCircle className="size-3.5" />
                        )}
                        {pwdMsg.text}
                      </div>
                    )}

                    <div className="mt-5 flex justify-end gap-3 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pwdSaving}
                        onClick={() => {
                          setPasswordOpen(false);
                          setPwdMsg(null);
                          setCurrentPwd("");
                          setNewPwd("");
                          setConfirmPwd("");
                          setOtpCode("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={pwdSaving}>
                        {pwdSaving && <Loader2 className="size-3.5 animate-spin" />}
                        {pwdSaving ? "Updating password…" : "Update password"}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="mt-7 border-t border-border pt-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Where you’re logged in</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Devices and browsers with active session access to your Yuvro account.
                      </p>
                    </div>

                    {sessions.filter((s) => !s.is_current).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        onClick={handleRevokeAllOthers}
                      >
                        Log out of other devices
                      </Button>
                    )}
                  </div>

                  {isLoadingSessions && sessions.length === 0 ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2 bg-muted/20 rounded-xl border border-border">
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Loading active sessions…
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(sessions.length > 0
                        ? sessions
                        : [
                            {
                              id: "current",
                              browser: deviceInfo.browser,
                              os: deviceInfo.os,
                              device_type: deviceInfo.isMobile ? "Mobile" : "Desktop",
                              location: user?.location || "India",
                              ip_address: "127.0.0.1",
                              last_activity: new Date().toISOString(),
                              created_at: new Date().toISOString(),
                              is_current: true,
                            },
                          ]
                      ).map((sess) => (
                        <div
                          key={sess.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                              {sess.device_type === "Mobile" ? (
                                <Smartphone className="size-5" />
                              ) : (
                                <Laptop className="size-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">
                                  {sess.browser} on {sess.os}
                                </h4>
                                {sess.is_current ? (
                                  <>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Active now
                                    </span>
                                    <span className="rounded-md border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      This device
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Active session
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[
                                  sess.location || "India",
                                  sess.is_current
                                    ? user?.last_login
                                      ? `Last login: ${new Date(user.last_login).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}`
                                      : "Active Web Session"
                                    : `Last active: ${new Date(sess.last_activity).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {sess.is_current ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                onClick={() => {
                                  authService.logoutUser();
                                }}
                              >
                                <LogOut className="size-3.5" />
                                <span>Log out</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={revokingId === sess.id}
                                className="h-8 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                onClick={() => handleRevokeSession(sess.id)}
                              >
                                {revokingId === sess.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <LogOut className="size-3.5" />
                                )}
                                <span>Log out device</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-7 flex items-start justify-between gap-4 border-t border-border pt-6">
                  <div>
                    <h3 className="text-sm font-medium">Delete account</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Permanent account deletion requires contacting administrator support.
                    </p>
                  </div>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-destructive text-sm"
                    disabled
                    title="Contact admin to delete account"
                  >
                    Delete account
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* ── Disconnect GitHub Modal ───────────────────────── */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-semibold mb-2">Disconnect GitHub</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Type <strong className="text-foreground">{githubHandle}</strong> to
              confirm you want to disconnect this account.
            </p>
            <Input
              type="text"
              value={disconnectInput}
              onChange={(e) => setDisconnectInput(e.target.value)}
              className={`${inputClass} mb-4`}
              placeholder={githubHandle}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDisconnectModal(false)}
                disabled={disconnecting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDisconnect}
                disabled={disconnectInput !== githubHandle || disconnecting}
              >
                {disconnecting && <Loader2 className="size-4 animate-spin" />}
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notice Toast ──────────────────────────────────── */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 w-max max-w-[90vw] -translate-x-1/2 rounded-lg border border-border bg-card px-5 py-3 text-center text-sm font-medium text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {notice}
        </div>
      )}
    </div>
  );
}

function Heading({
  title,
  subtitle,
  optional,
}: {
  title: string;
  subtitle: string;
  optional?: boolean;
}) {
  return (
    <div className="mb-6">
      <h2 className="flex items-center gap-3 text-xl font-medium tracking-tight">
        {title}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">
            Optional
          </span>
        )}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
  error,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  error?: string | null;
  hint?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
        {hint && !error && (
          <span className="text-[11px] font-normal text-muted-foreground/75">
            {hint}
          </span>
        )}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}
